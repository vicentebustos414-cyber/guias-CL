import { Router, Request, Response } from 'express';
import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

const FLOW_API_KEY = process.env.FLOW_API_KEY || '';
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY || '';
const APP_URL = process.env.APP_URL || 'http://localhost:5173';

const PRICES: Record<string, number> = {
  pro: 9990,
  business: 24990,
};

function signFlowRequest(data: any): string {
  const str = FLOW_API_KEY + FLOW_SECRET_KEY + JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

// GET /api/billing/plans
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    free: { name: 'Gratuito', guias: 30, price: 0 },
    pro: { name: 'Pro', guias: Infinity, price: PRICES.pro },
    business: { name: 'Business', guias: Infinity, price: PRICES.business },
  });
});

// GET /api/billing/me
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await queryOne<{
      plan: string;
      email: string;
      guias_mes_count: number;
      guias_mes_reset: string;
    }>(
      'SELECT plan, email, guias_mes_count, guias_mes_reset FROM users WHERE id = $1',
      [req.userId]
    );

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const currentMonth = new Date().toISOString().slice(0, 7);
    const guiasUsadas = user.guias_mes_reset === currentMonth ? user.guias_mes_count : 0;
    const limiteMensual = user.plan === 'free' ? 30 : null;

    res.json({
      plan: user.plan || 'free',
      email: user.email,
      guias_usadas: guiasUsadas,
      limite_mensual: limiteMensual,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// POST /api/billing/checkout
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body;
  if (!['pro', 'business'].includes(plan)) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  try {
    const user = await queryOne<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [req.userId]
    );

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const amount = PRICES[plan];
    const commerceOrder = `GUIAS-${req.userId}-${Date.now()}`;
    const returnUrl = `${APP_URL}/app`;
    const failureUrl = `${APP_URL}/app`;

    const payload = {
      apikey: FLOW_API_KEY,
      commerceOrder,
      subject: `Plan ${plan.toUpperCase()} - Guías Flete Chile`,
      amount,
      email: user.email,
      commerceId: FLOW_API_KEY,
      returnUrl,
      failureUrl,
    };

    (payload as any).s = signFlowRequest(payload);

    const response = await axios.post('https://sandbox.flow.cl/api/payment/create', payload);

    if (response.data?.url && response.data?.flowOrder) {
      await query(
        `INSERT INTO billing_orders (user_id, flow_order, plan, amount, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (flow_order) DO UPDATE SET created_at = NOW()`,
        [req.userId, response.data.flowOrder, plan, amount]
      );

      res.json({ url: response.data.url });
    } else {
      res.status(400).json({ error: 'Flow error: ' + JSON.stringify(response.data) });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Error: ' + err.message });
  }
});

// POST /api/billing/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const expectedSig = signFlowRequest(body);
    if (body.s !== expectedSig) {
      return res.status(400).json({ error: 'Firma inválida' });
    }

    const { status, flowOrder } = body;

    if (status !== 'PAID') {
      return res.status(200).json({ ok: true });
    }

    const order = await queryOne<{ user_id: number; plan: string }>(
      'SELECT user_id, plan FROM billing_orders WHERE flow_order = $1',
      [flowOrder]
    );

    if (!order) {
      return res.status(400).json({ error: 'Orden no encontrada' });
    }

    await query('UPDATE users SET plan = $1 WHERE id = $2', [order.plan, order.user_id]);
    await query('UPDATE billing_orders SET processed = true WHERE flow_order = $1', [flowOrder]);

    res.json({ ok: true });
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook error' });
  }
});

// POST /api/billing/portal
router.post('/portal', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({ url: `${APP_URL}/app` });
});

export { router as billingRouter };
