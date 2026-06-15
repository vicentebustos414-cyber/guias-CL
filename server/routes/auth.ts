import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db';
import { signToken } from '../middleware/auth';

const router = Router();

const PLAN_LIMITS = { free: 30, pro: Infinity, business: Infinity };

router.post('/register', async (req: Request, res: Response) => {
  const { email, password, empresa_nombre } = req.body;

  if (!email || !password || !empresa_nombre) {
    res.status(400).json({ error: 'Email, contraseña y nombre de empresa son requeridos' });
    return;
  }
  if (typeof password !== 'string' || password.length < 8) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Email inválido' });
    return;
  }

  try {
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing) {
      res.status(409).json({ error: 'Este email ya está registrado' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const [user] = await query<{ id: number; plan: string }>(
      `INSERT INTO users (email, password_hash, empresa_nombre) VALUES ($1, $2, $3) RETURNING id, plan`,
      [email.toLowerCase(), hash, empresa_nombre.trim()]
    );

    // Initialize config for new user
    await query('INSERT INTO config (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    const token = signToken(user.id, user.plan);
    res.status(201).json({ token, plan: user.plan, email: email.toLowerCase() });
  } catch (err) {
    console.error('register error', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email y contraseña son requeridos' });
    return;
  }

  try {
    const user = await queryOne<{ id: number; password_hash: string; plan: string }>(
      'SELECT id, password_hash, plan FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = signToken(user.id, user.plan);
    res.json({ token, plan: user.plan, email: email.toLowerCase() });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export { router as authRouter, PLAN_LIMITS };
