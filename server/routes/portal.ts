import { Router, Request, Response } from 'express';
import { queryOne } from '../db';

const router = Router();

// GET /api/portal/:token — público, sin auth
router.get('/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  if (!token || !/^[a-f0-9]{32,64}$/.test(token)) {
    res.status(400).json({ error: 'Token inválido' });
    return;
  }

  const guia = await queryOne(
    'SELECT * FROM guias WHERE share_token = $1',
    [token]
  );

  if (!guia) {
    res.status(404).json({ error: 'Guía no encontrada o token expirado' });
    return;
  }

  // Parsear cargos_extra si viene como string
  if (typeof guia.cargos_extra === 'string') {
    try { guia.cargos_extra = JSON.parse(guia.cargos_extra); } catch { guia.cargos_extra = []; }
  }

  // No exponer datos sensibles del usuario propietario
  const { user_id: _uid, ...safeGuia } = guia;
  res.json(safeGuia);
});

export { router as portalRouter };
