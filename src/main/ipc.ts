import { ipcMain, dialog, shell, app } from 'electron';
import { getDb, persist } from './database';
import type { Guia, AppConfig, Viaje } from '../shared/types';
import fs from 'fs';
import path from 'path';

// Validates that a file path stays within an allowed directory and has expected extension.
function validateFilePath(filePath: unknown, allowedExt: string): string {
  if (typeof filePath !== 'string' || !filePath) throw new Error('Invalid file path');
  const resolved = path.resolve(filePath);
  if (path.extname(resolved).toLowerCase() !== allowedExt) {
    throw new Error(`File must have ${allowedExt} extension`);
  }
  // Reject paths pointing to system-critical directories
  const forbidden = [app.getAppPath(), process.execPath, process.env.SystemRoot || 'C:\\Windows'].map(p => path.resolve(p));
  if (forbidden.some(f => resolved.startsWith(f))) {
    throw new Error('Cannot write to system directory');
  }
  return resolved;
}

function sanitizeString(v: unknown, field: string, maxLen = 255): string {
  if (typeof v !== 'string') throw new Error(`${field} must be a string`);
  const s = v.trim();
  if (s.length > maxLen) throw new Error(`${field} exceeds maximum length`);
  return s;
}

function sanitizeNumber(v: unknown, field: string): number {
  const n = Number(v);
  if (!isFinite(n) || n < 0) throw new Error(`${field} must be a non-negative number`);
  return n;
}

function all(sql: string, ...params: any[]): any[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql: string, params: Record<string, any> = {}) {
  getDb().run(sql, params);
  persist();
}

function get(sql: string, ...params: any[]): any | null {
  const rows = all(sql, ...params);
  return rows[0] ?? null;
}

export function registerIpcHandlers() {

  // ── Guías ──────────────────────────────────────────────────────────────────

  ipcMain.handle('guias:list', (_e, filtro?: string) => {
    let sql = 'SELECT * FROM guias';
    const params: any[] = [];
    if (filtro) {
      sql += ' WHERE numero_guia LIKE ? OR empresa_flete LIKE ? OR origen LIKE ? OR destino LIKE ?';
      const q = `%${filtro}%`;
      params.push(q, q, q, q);
    }
    sql += ' ORDER BY rowid DESC';
    return all(sql, ...params).map(r => ({ ...r, cargos_extra: JSON.parse(r.cargos_extra || '[]') }));
  });

  ipcMain.handle('guias:get', (_e, id: number) => {
    const row = get('SELECT * FROM guias WHERE id = ?', id);
    if (!row) return null;
    return { ...row, cargos_extra: JSON.parse(row.cargos_extra || '[]') };
  });

  ipcMain.handle('guias:create', (_e, guia: Guia) => {
    const VALID_ESTADOS = ['pendiente', 'pagado', 'anulado'] as const;
    const estado = guia.estado;
    if (!VALID_ESTADOS.includes(estado)) throw new Error('Invalid estado value');

    run(`INSERT INTO guias (numero_guia,fecha,origen,destino,empresa_flete,rut_empresa,
          nombre_chofer,rut_chofer,patente,descripcion_carga,monto_base,cargos_extra,
          monto_total,estado,notas)
         VALUES (:numero_guia,:fecha,:origen,:destino,:empresa_flete,:rut_empresa,
          :nombre_chofer,:rut_chofer,:patente,:descripcion_carga,:monto_base,:cargos_extra,
          :monto_total,:estado,:notas)`, {
      ':numero_guia': sanitizeString(guia.numero_guia, 'numero_guia', 20),
      ':fecha': sanitizeString(guia.fecha, 'fecha', 10),
      ':origen': sanitizeString(guia.origen, 'origen'),
      ':destino': sanitizeString(guia.destino, 'destino'),
      ':empresa_flete': sanitizeString(guia.empresa_flete, 'empresa_flete'),
      ':rut_empresa': sanitizeString(guia.rut_empresa || '', 'rut_empresa', 15),
      ':nombre_chofer': sanitizeString(guia.nombre_chofer || '', 'nombre_chofer'),
      ':rut_chofer': sanitizeString(guia.rut_chofer || '', 'rut_chofer', 15),
      ':patente': sanitizeString(guia.patente || '', 'patente', 8),
      ':descripcion_carga': sanitizeString(guia.descripcion_carga || '', 'descripcion_carga', 500),
      ':monto_base': sanitizeNumber(guia.monto_base, 'monto_base'),
      ':cargos_extra': JSON.stringify(Array.isArray(guia.cargos_extra) ? guia.cargos_extra : []),
      ':monto_total': sanitizeNumber(guia.monto_total, 'monto_total'),
      ':estado': estado,
      ':notas': sanitizeString(guia.notas || '', 'notas', 1000),
    });

    const match = guia.numero_guia.match(/(\d+)$/);
    if (match) {
      run('UPDATE config SET ultimo_numero = MAX(ultimo_numero, :n) WHERE id = 1', { ':n': parseInt(match[1]) });
    }

    const saved = get('SELECT id FROM guias WHERE numero_guia = ?', guia.numero_guia);
    return { ...guia, id: saved?.id };
  });

  ipcMain.handle('guias:update', (_e, guia: Guia) => {
    run(`UPDATE guias SET fecha=:fecha,origen=:origen,destino=:destino,empresa_flete=:empresa_flete,
         rut_empresa=:rut_empresa,nombre_chofer=:nombre_chofer,rut_chofer=:rut_chofer,
         patente=:patente,descripcion_carga=:descripcion_carga,monto_base=:monto_base,
         cargos_extra=:cargos_extra,monto_total=:monto_total,estado=:estado,notas=:notas
         WHERE id=:id`, {
      ':fecha': guia.fecha, ':origen': guia.origen, ':destino': guia.destino,
      ':empresa_flete': guia.empresa_flete, ':rut_empresa': guia.rut_empresa || '',
      ':nombre_chofer': guia.nombre_chofer || '', ':rut_chofer': guia.rut_chofer || '',
      ':patente': guia.patente || '', ':descripcion_carga': guia.descripcion_carga || '',
      ':monto_base': guia.monto_base, ':cargos_extra': JSON.stringify(guia.cargos_extra),
      ':monto_total': guia.monto_total, ':estado': guia.estado,
      ':notas': guia.notas || '', ':id': guia.id,
    });
    return guia;
  });

  ipcMain.handle('guias:delete', (_e, id: number) => {
    run('DELETE FROM guias WHERE id = :id', { ':id': id });
    return true;
  });

  ipcMain.handle('guias:next-numero', () => {
    const row = get('SELECT prefijo_guia, ultimo_numero FROM config WHERE id=1');
    const next = (row?.ultimo_numero ?? 0) + 1;
    return `${row?.prefijo_guia ?? 'G'}${String(next).padStart(6, '0')}`;
  });

  // ── Configuración ──────────────────────────────────────────────────────────

  ipcMain.handle('config:get', () => {
    const row = get('SELECT * FROM config WHERE id=1');
    return {
      empresa_emisora: JSON.parse(row?.empresa_emisora || '{}'),
      prefijo_guia: row?.prefijo_guia ?? 'G',
      ultimo_numero: row?.ultimo_numero ?? 0,
    };
  });

  ipcMain.handle('config:save', (_e, config: AppConfig) => {
    run('UPDATE config SET empresa_emisora=:e, prefijo_guia=:p WHERE id=1', {
      ':e': JSON.stringify(config.empresa_emisora),
      ':p': config.prefijo_guia,
    });
    return true;
  });

  // ── Viajes ─────────────────────────────────────────────────────────────────

  ipcMain.handle('viajes:list', (_e, filtro?: string) => {
    let sql = 'SELECT * FROM viajes';
    const params: any[] = [];
    if (filtro) {
      sql += ' WHERE empresa LIKE ? OR origen LIKE ? OR destino LIKE ? OR nombre_chofer LIKE ? OR patente LIKE ?';
      const q = `%${filtro}%`;
      params.push(q, q, q, q, q);
    }
    sql += ' ORDER BY rowid DESC';
    return all(sql, ...params);
  });

  ipcMain.handle('viajes:get', (_e, id: number) => {
    return get('SELECT * FROM viajes WHERE id = ?', id);
  });

  ipcMain.handle('viajes:create', (_e, v: Viaje) => {
    run(`INSERT INTO viajes (fecha,origen,destino,empresa,nombre_chofer,patente,
          kilometros,duracion_horas,monto_cobrado,estado,numero_guia,notas)
         VALUES (:fecha,:origen,:destino,:empresa,:nombre_chofer,:patente,
          :kilometros,:duracion_horas,:monto_cobrado,:estado,:numero_guia,:notas)`, {
      ':fecha': v.fecha, ':origen': v.origen, ':destino': v.destino,
      ':empresa': v.empresa, ':nombre_chofer': v.nombre_chofer || '',
      ':patente': v.patente || '', ':kilometros': v.kilometros || 0,
      ':duracion_horas': v.duracion_horas || 0, ':monto_cobrado': v.monto_cobrado || 0,
      ':estado': v.estado || 'realizado', ':numero_guia': v.numero_guia || '',
      ':notas': v.notas || '',
    });
    const saved = get('SELECT id FROM viajes ORDER BY rowid DESC LIMIT 1');
    return { ...v, id: saved?.id };
  });

  ipcMain.handle('viajes:update', (_e, v: Viaje) => {
    run(`UPDATE viajes SET fecha=:fecha,origen=:origen,destino=:destino,empresa=:empresa,
         nombre_chofer=:nombre_chofer,patente=:patente,kilometros=:kilometros,
         duracion_horas=:duracion_horas,monto_cobrado=:monto_cobrado,
         estado=:estado,numero_guia=:numero_guia,notas=:notas WHERE id=:id`, {
      ':fecha': v.fecha, ':origen': v.origen, ':destino': v.destino,
      ':empresa': v.empresa, ':nombre_chofer': v.nombre_chofer || '',
      ':patente': v.patente || '', ':kilometros': v.kilometros || 0,
      ':duracion_horas': v.duracion_horas || 0, ':monto_cobrado': v.monto_cobrado || 0,
      ':estado': v.estado, ':numero_guia': v.numero_guia || '',
      ':notas': v.notas || '', ':id': v.id,
    });
    return v;
  });

  ipcMain.handle('viajes:delete', (_e, id: number) => {
    run('DELETE FROM viajes WHERE id = :id', { ':id': id });
    return true;
  });

  // ── PDF ────────────────────────────────────────────────────────────────────

  ipcMain.handle('guias:export-path', async (_e, numeroGuia: string) => {
    const { filePath } = await dialog.showSaveDialog({
      title: 'Guardar Guía PDF',
      defaultPath: `Guia_${numeroGuia}.pdf`,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });
    return filePath || null;
  });

  ipcMain.handle('guias:save-pdf', async (_e, pdfBuffer: unknown, filePath: unknown) => {
    // Validate path: must end in .pdf, must not be in system directories
    const safePath = validateFilePath(filePath, '.pdf');

    // Validate buffer: must be an array of numbers (PDF bytes)
    if (!Array.isArray(pdfBuffer) || pdfBuffer.length > 10 * 1024 * 1024) {
      throw new Error('Invalid PDF buffer');
    }

    fs.writeFileSync(safePath, Buffer.from(pdfBuffer as number[]));
    // shell.openPath only opens the file in its default viewer — safe after path validation
    shell.openPath(safePath);
    return true;
  });
}
