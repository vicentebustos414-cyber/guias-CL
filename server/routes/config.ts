import { Router, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: AuthRequest, res: Response) => {
  await query('INSERT INTO config (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.userId]);
  const row = await queryOne<{ empresa_emisora: any; prefijo_guia: string; ultimo_numero: number; firma_imagen: string | null }>(
    'SELECT empresa_emisora, prefijo_guia, ultimo_numero, firma_imagen FROM config WHERE user_id = $1', [req.userId]
  );
  res.json({
    empresa_emisora: row?.empresa_emisora ?? {},
    prefijo_guia: row?.prefijo_guia ?? 'G',
    ultimo_numero: row?.ultimo_numero ?? 0,
    firma_imagen: row?.firma_imagen ?? null,
  });
});

router.put('/', async (req: AuthRequest, res: Response) => {
  const { empresa_emisora, prefijo_guia, firma_imagen } = req.body;
  await query(
    'UPDATE config SET empresa_emisora = $1, prefijo_guia = $2, firma_imagen = $3 WHERE user_id = $4',
    [JSON.stringify(empresa_emisora), prefijo_guia ?? 'G', firma_imagen ?? null, req.userId]
  );
  res.json({ ok: true });
});

export { router as configRouter };
