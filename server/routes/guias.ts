import { Router, Response } from 'express';
import { randomBytes } from 'crypto';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { PLAN_LIMITS } from './auth';

const router = Router();
router.use(requireAuth);

// GET /api/guias
router.get('/', async (req: AuthRequest, res: Response) => {
  const { filtro } = req.query;
  let sql = 'SELECT * FROM guias WHERE user_id = $1';
  const params: any[] = [req.userId];

  if (filtro && typeof filtro === 'string') {
    sql += ` AND (numero_guia ILIKE $2 OR empresa_flete ILIKE $2 OR origen ILIKE $2 OR destino ILIKE $2)`;
    params.push(`%${filtro}%`);
  }

  sql += ' ORDER BY id DESC';
  const rows = await query(sql, params);
  res.json(rows);
});

// GET /api/guias/:id
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const row = await queryOne('SELECT * FROM guias WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!row) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json(row);
});

// POST /api/guias
router.post('/', async (req: AuthRequest, res: Response) => {
  const plan = (req.userPlan ?? 'free') as keyof typeof PLAN_LIMITS;
  const limit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

  // Enforce plan limit
  if (isFinite(limit)) {
    const user = await queryOne<{ guias_mes_count: number; guias_mes_reset: string }>(
      'SELECT guias_mes_count, guias_mes_reset FROM users WHERE id = $1', [req.userId]
    );
    const currentMonth = new Date().toISOString().slice(0, 7);
    const count = user?.guias_mes_reset === currentMonth ? (user?.guias_mes_count ?? 0) : 0;

    if (count >= limit) {
      res.status(403).json({
        error: `Plan gratuito: límite de ${limit} guías por mes alcanzado. Actualiza a Pro para continuar.`,
        upgrade_url: '/pricing',
      });
      return;
    }

    // Update counter (reset if new month)
    if (user?.guias_mes_reset !== currentMonth) {
      await query('UPDATE users SET guias_mes_count = 1, guias_mes_reset = $1 WHERE id = $2', [currentMonth, req.userId]);
    } else {
      await query('UPDATE users SET guias_mes_count = guias_mes_count + 1 WHERE id = $1', [req.userId]);
    }
  }

  const g = req.body;
  const shareToken = randomBytes(24).toString('hex');
  const [row] = await query(
    `INSERT INTO guias (user_id,numero_guia,fecha,origen,destino,empresa_flete,rut_empresa,
      nombre_chofer,rut_chofer,patente,descripcion_carga,monto_base,cargos_extra,monto_total,estado,notas,share_token)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
    [req.userId, g.numero_guia, g.fecha, g.origen, g.destino, g.empresa_flete,
     g.rut_empresa || '', g.nombre_chofer || '', g.rut_chofer || '', g.patente || '',
     g.descripcion_carga || '', g.monto_base || 0, JSON.stringify(g.cargos_extra || []),
     g.monto_total || 0, g.estado || 'pendiente', g.notas || '', shareToken]
  );

  // Update ultimo_numero in config
  const match = String(g.numero_guia).match(/(\d+)$/);
  if (match) {
    await query(
      'UPDATE config SET ultimo_numero = GREATEST(ultimo_numero, $1) WHERE user_id = $2',
      [parseInt(match[1]), req.userId]
    );
  }

  res.status(201).json(row);
});

// PUT /api/guias/:id
router.put('/:id', async (req: AuthRequest, res: Response) => {
  const g = req.body;
  const existing = await queryOne('SELECT id FROM guias WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) { res.status(404).json({ error: 'No encontrado' }); return; }

  const [row] = await query(
    `UPDATE guias SET fecha=$1,origen=$2,destino=$3,empresa_flete=$4,rut_empresa=$5,
      nombre_chofer=$6,rut_chofer=$7,patente=$8,descripcion_carga=$9,monto_base=$10,
      cargos_extra=$11,monto_total=$12,estado=$13,notas=$14
     WHERE id=$15 AND user_id=$16 RETURNING *`,
    [g.fecha, g.origen, g.destino, g.empresa_flete, g.rut_empresa || '',
     g.nombre_chofer || '', g.rut_chofer || '', g.patente || '', g.descripcion_carga || '',
     g.monto_base || 0, JSON.stringify(g.cargos_extra || []), g.monto_total || 0,
     g.estado, g.notas || '', req.params.id, req.userId]
  );
  res.json(row);
});

// DELETE /api/guias/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await query('DELETE FROM guias WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
  if (!result.length) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json({ ok: true });
});

// POST /api/guias/:id/share — genera o renueva el share_token
router.post('/:id/share', async (req: AuthRequest, res: Response) => {
  const existing = await queryOne<{ share_token: string }>(
    'SELECT share_token FROM guias WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]
  );
  if (!existing) { res.status(404).json({ error: 'No encontrado' }); return; }
  const token = existing.share_token ?? randomBytes(24).toString('hex');
  if (!existing.share_token) {
    await query('UPDATE guias SET share_token = $1 WHERE id = $2 AND user_id = $3', [token, req.params.id, req.userId]);
  }
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
  res.json({ token, url: `${appUrl}/guia/${token}` });
});

// GET /api/guias/next-numero
router.get('/meta/next-numero', async (req: AuthRequest, res: Response) => {
  const cfg = await queryOne<{ prefijo_guia: string; ultimo_numero: number }>(
    'SELECT prefijo_guia, ultimo_numero FROM config WHERE user_id = $1', [req.userId]
  );
  const next = (cfg?.ultimo_numero ?? 0) + 1;
  res.json({ numero: `${cfg?.prefijo_guia ?? 'G'}${String(next).padStart(6, '0')}` });
});

export { router as guiasRouter };
