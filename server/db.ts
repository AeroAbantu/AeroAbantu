import { Pool } from 'pg';

// Production-ready DB: Postgres (managed preferred).
// Required env: DATABASE_URL (e.g. postgres://user:pass@host:5432/aerobantu)

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Heroku / some managed PG require SSL; allow opt-in via PGSSL=1
  ssl: process.env.PGSSL === '1' ? { rejectUnauthorized: false } : undefined,
});

export async function migrate() {
  // Keep migrations minimal and idempotent (CREATE IF NOT EXISTS).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      verified BOOLEAN NOT NULL DEFAULT FALSE,
      tactical_id TEXT NOT NULL,
      full_name TEXT,
      blood_type TEXT,
      emergency_note TEXT,
      created_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS codes (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      consumed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_codes_user_kind ON codes(user_id, kind);
    CREATE INDEX IF NOT EXISTS idx_codes_expires ON codes(expires_at);

    -- Latest location per session (persistent across restarts)
    CREATE TABLE IF NOT EXISTS tracking_latest (
      session_id TEXT PRIMARY KEY,
      lat DOUBLE PRECISION NOT NULL,
      lng DOUBLE PRECISION NOT NULL,
      accuracy DOUBLE PRECISION NOT NULL,
      speed_kmh DOUBLE PRECISION NOT NULL,
      battery DOUBLE PRECISION,
      network TEXT,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tracking_latest_updated ON tracking_latest(updated_at);
  `);
}

export type DbUser = {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  verified: boolean;
  tactical_id: string;
  full_name: string | null;
  blood_type: string | null;
  emergency_note: string | null;
  created_at: number;
};
