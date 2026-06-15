import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest, signToken } from '../middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-05-28.basil' });
const router = Router();

const PLANS = {
  pro: {
    name: 'Pro',
    price_id: process.env.STRIPE_PRICE_PRO!,
    price_clp: 9990,
    features: ['Guías ilimitadas', 'Exportar PDF y Excel', 'Viajes ilimitados', 'Soporte por email'],
  },
  business: {
    name: 'Business',
    price_id: process.env.STRIPE_PRICE_BUSINESS!,
    price_clp: 24990,
    features: ['Todo de Pro', 'Múltiples usuarios (hasta 5)', 'Reportes avanzados', 'Soporte prioritario', 'Branding personalizado'],
  },
};

// GET /api/billing/plans — public
router.get('/plans', (_req: Request, res: Response) => {
  res.json(PLANS);
});

// POST /api/billing/checkout — creates Stripe checkout session
router.post('/checkout', requireAuth, async (req: AuthRequest, res: Response) => {
  const { plan } = req.body as { plan: 'pro' | 'business' };
  if (!PLANS[plan]) { res.status(400).json({ error: 'Plan inválido' }); return; }

  const user = await queryOne<{ email: string; stripe_customer_id: string | null }>(
    'SELECT email, stripe_customer_id FROM users WHERE id = $1', [req.userId]
  );
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: String(req.userId) } });
    customerId = customer.id;
    await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.userId]);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: PLANS[plan].price_id, quantity: 1 }],
    mode: 'subscription',
    success_url: `${process.env.APP_URL}/app?plan_success=1`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    metadata: { userId: String(req.userId), plan },
  });

  res.json({ url: session.url });
});

// POST /api/billing/portal — Stripe customer portal
router.post('/portal', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await queryOne<{ stripe_customer_id: string | null }>(
    'SELECT stripe_customer_id FROM users WHERE id = $1', [req.userId]
  );
  if (!user?.stripe_customer_id) { res.status(400).json({ error: 'Sin suscripción activa' }); return; }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${process.env.APP_URL}/app`,
  });
  res.json({ url: session.url });
});

// POST /api/billing/webhook — Stripe webhook
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan;
    if (userId && plan) {
      await query('UPDATE users SET plan = $1, stripe_subscription_id = $2 WHERE id = $3',
        [plan, session.subscription, userId]);
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await query('UPDATE users SET plan = $1 WHERE stripe_subscription_id = $2', ['free', sub.id]);
  }

  res.json({ received: true });
});

// GET /api/billing/me — returns current user plan
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await queryOne<{ plan: string; guias_mes_count: number; guias_mes_reset: string; email: string }>(
    'SELECT plan, guias_mes_count, guias_mes_reset, email FROM users WHERE id = $1', [req.userId]
  );
  if (!user) { res.status(404).json({ error: 'Usuario no encontrado' }); return; }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const usedThisMonth = user.guias_mes_reset === currentMonth ? user.guias_mes_count : 0;
  const limit = user.plan === 'free' ? 10 : null;

  res.json({ plan: user.plan, email: user.email, guias_usadas: usedThisMonth, limite_mensual: limit });
});

export { router as billingRouter };
