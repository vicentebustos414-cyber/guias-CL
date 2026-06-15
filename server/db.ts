import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      empresa_nombre TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      guias_mes_count INTEGER NOT NULL DEFAULT 0,
      guias_mes_reset TEXT NOT NULL DEFAULT to_char(NOW(), 'YYYY-MM'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guias (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      numero_guia TEXT NOT NULL,
      fecha TEXT NOT NULL,
      origen TEXT NOT NULL,
      destino TEXT NOT NULL,
      empresa_flete TEXT NOT NULL,
      rut_empresa TEXT NOT NULL DEFAULT '',
      nombre_chofer TEXT NOT NULL DEFAULT '',
      rut_chofer TEXT NOT NULL DEFAULT '',
      patente TEXT NOT NULL DEFAULT '',
      descripcion_carga TEXT NOT NULL DEFAULT '',
      monto_base NUMERIC NOT NULL DEFAULT 0,
      cargos_extra JSONB NOT NULL DEFAULT '[]',
      monto_total NUMERIC NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      notas TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, numero_guia)
    );

    CREATE TABLE IF NOT EXISTS viajes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      fecha TEXT NOT NULL,
      origen TEXT NOT NULL,
      destino TEXT NOT NULL,
      empresa TEXT NOT NULL,
      nombre_chofer TEXT NOT NULL DEFAULT '',
      patente TEXT NOT NULL DEFAULT '',
      kilometros NUMERIC NOT NULL DEFAULT 0,
      duracion_horas NUMERIC NOT NULL DEFAULT 0,
      monto_cobrado NUMERIC NOT NULL DEFAULT 0,
      estado TEXT NOT NULL DEFAULT 'realizado',
      numero_guia TEXT,
      notas TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS config (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      empresa_emisora JSONB NOT NULL DEFAULT '{"nombre":"","rut":"","direccion":"","telefono":"","email":"","giro":""}',
      prefijo_guia TEXT NOT NULL DEFAULT 'G',
      ultimo_numero INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_guias_user ON guias(user_id);
    CREATE INDEX IF NOT EXISTS idx_viajes_user ON viajes(user_id);
  `);

  // Migrations: add share_token column if not exists
  await pool.query(`
    ALTER TABLE guias ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
    CREATE INDEX IF NOT EXISTS idx_guias_token ON guias(share_token);
  `);

  // Auto-create owner account if ADMIN_EMAIL and ADMIN_PASSWORD are set
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPass  = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPass) {
    const bcrypt = require('bcryptjs');
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash(adminPass, 12);
      const res = await pool.query(
        `INSERT INTO users (email, password_hash, empresa_nombre, plan)
         VALUES ($1, $2, $3, 'business') RETURNING id`,
        [adminEmail, hash, 'Propietario']
      );
      await pool.query('INSERT INTO config (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [res.rows[0].id]);
      console.log('Owner account created:', adminEmail);
    }
  }

  console.log('Database initialized');
}

export default pool;
