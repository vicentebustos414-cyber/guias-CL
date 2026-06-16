import path from 'path';
import fs from 'fs';
import { app } from 'electron';

const initSqlJs = require('sql.js');

const dbPath = path.join(app.getPath('userData'), 'guias-chile.db');
let _db: any = null;

export async function initDatabase() {
  // El wasm está en app.asar.unpacked en producción (asarUnpack)
  const appPath = app.getAppPath();
  const wasmDir = appPath.includes('app.asar')
    ? appPath.replace('app.asar', 'app.asar.unpacked')
    : appPath;

  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(wasmDir, 'node_modules', 'sql.js', 'dist', file),
  });

  if (fs.existsSync(dbPath)) {
    _db = new SQL.Database(Buffer.from(fs.readFileSync(dbPath)));
  } else {
    _db = new SQL.Database();
  }

  _db.run(`
    CREATE TABLE IF NOT EXISTS guias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero_guia TEXT NOT NULL UNIQUE,
      fecha TEXT NOT NULL,
      origen TEXT NOT NULL,
      destino TEXT NOT NULL,
      empresa_flete TEXT NOT NULL,
      rut_empresa TEXT,
      nombre_chofer TEXT,
      rut_chofer TEXT,
      patente TEXT,
      descripcion_carga TEXT,
      monto_base REAL NOT NULL DEFAULT 0,
      cargos_extra TEXT NOT NULL DEFAULT '[]',
      monto_total REAL NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS viajes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      origen TEXT NOT NULL,
      destino TEXT NOT NULL,
      empresa TEXT NOT NULL,
      nombre_chofer TEXT NOT NULL DEFAULT '',
      patente TEXT NOT NULL DEFAULT '',
      kilometros REAL NOT NULL DEFAULT 0,
      duracion_horas REAL NOT NULL DEFAULT 0,
      monto_cobrado REAL NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'realizado',
      numero_guia TEXT,
      notas TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      empresa_emisora TEXT NOT NULL DEFAULT '{}',
      prefijo_guia TEXT NOT NULL DEFAULT 'G',
      ultimo_numero INTEGER NOT NULL DEFAULT 0,
      firma_imagen TEXT
    );
    INSERT OR IGNORE INTO config (id, empresa_emisora, prefijo_guia, ultimo_numero)
    VALUES (1, '{"nombre":"","rut":"","direccion":"","telefono":"","email":"","giro":""}', 'G', 0);
  `);

  // Migración: añadir firma_imagen si no existe (bases de datos existentes)
  try { _db.run('ALTER TABLE config ADD COLUMN firma_imagen TEXT'); } catch { /* ya existe */ }

  persist();
}

export function persist() {
  if (!_db) return;
  fs.writeFileSync(dbPath, Buffer.from(_db.export()));
}

export function getDb() { return _db; }
