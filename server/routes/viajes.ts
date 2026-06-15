import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  const { filtro } = req.query;
  let sql = 'SELECT * FROM viajes WHERE user_id = $1';
  const params: any[] = [req.userId];
  if (filtro && typeof filtro === 'string') {
    sql += ` AND (empresa ILIKE $2 OR origen ILIKE $2 OR destino ILIKE $2 OR nombre_chofer ILIKE $2 OR patente ILIKE $2)`;
    params.push(`%${filtro}%`);
  }
  sql += ' ORDER BY id DESC';
  res.json(await query(sql, params));
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  const row = await queryOne('SELECT * FROM viajes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!row) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json(row);
});

router.post('/', async (req: AuthRequest, res: Response) => {
  const v = req.body;
  const [row] = await query(
    `INSERT INTO viajes (user_id,fecha,origen,destino,empresa,nombre_chofer,patente,
      kilometros,duracion_horas,monto_cobrado,estado,numero_guia,notas)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [req.userId, v.fecha, v.origen, v.destino, v.empresa, v.nombre_chofer || '',
     v.patente || '', v.kilometros || 0, v.duracion_horas || 0, v.monto_cobrado || 0,
     v.estado || 'realizado', v.numero_guia || '', v.notas || '']
  );
  res.status(201).json(row);
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  const v = req.body;
  const existing = await queryOne('SELECT id FROM viajes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  if (!existing) { res.status(404).json({ error: 'No encontrado' }); return; }
  const [row] = await query(
    `UPDATE viajes SET fecha=$1,origen=$2,destino=$3,empresa=$4,nombre_chofer=$5,
      patente=$6,kilometros=$7,duracion_horas=$8,monto_cobrado=$9,estado=$10,numero_guia=$11,notas=$12
     WHERE id=$13 AND user_id=$14 RETURNING *`,
    [v.fecha, v.origen, v.destino, v.empresa, v.nombre_chofer || '', v.patente || '',
     v.kilometros || 0, v.duracion_horas || 0, v.monto_cobrado || 0,
     v.estado, v.numero_guia || '', v.notas || '', req.params.id, req.userId]
  );
  res.json(row);
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await query('DELETE FROM viajes WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
  if (!result.length) { res.status(404).json({ error: 'No encontrado' }); return; }
  res.json({ ok: true });
});

export { router as viajesRouter };
