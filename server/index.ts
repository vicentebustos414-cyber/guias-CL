import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { initDb } from './db';
import { authRouter } from './routes/auth';
import { guiasRouter } from './routes/guias';
import { viajesRouter } from './routes/viajes';
import { configRouter } from './routes/config';
import { billingRouter } from './routes/billing';
import { portalRouter } from './routes/portal';

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
    },
  },
}));

// CORS — restrict to your domain in production
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:5173'];
app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));

// Rate limiting on auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo en 15 minutos.' },
});

// Parse JSON — raw body needed for Stripe webhook
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/guias', guiasRouter);
app.use('/api/viajes', viajesRouter);
app.use('/api/config', configRouter);
app.use('/api/billing', billingRouter);
app.use('/api/portal', portalRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

initDb().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
