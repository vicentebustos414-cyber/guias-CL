import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: number;
  userPlan?: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' });
    return;
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { userId: number; plan: string };
    req.userId = payload.userId;
    req.userPlan = payload.plan;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function signToken(userId: number, plan: string): string {
  return jwt.sign({ userId, plan }, JWT_SECRET, { expiresIn: '30d' });
}
