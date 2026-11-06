import pg from "pg";

export function createDatabase() {
  return new pg.Pool({ ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {}), max: 5, connectionTimeoutMillis: 15000, idleTimeoutMillis: 10000 });
}

export async function initializeDatabase(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Khởi động nhiều server/test cùng lúc không tranh nhau tạo schema.
    await client.query("SELECT pg_advisory_xact_lock(73654219)");
    await client.query(`
    CREATE TABLE IF NOT EXISTS ww_users (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      username VARCHAR(24) NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ww_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES ww_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ww_sessions_expires_idx ON ww_sessions(expires_at);
    CREATE TABLE IF NOT EXISTS ww_rooms (
      code CHAR(6) PRIMARY KEY,
      host_id INTEGER NOT NULL REFERENCES ww_users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ww_room_members (
      user_id INTEGER PRIMARY KEY REFERENCES ww_users(id) ON DELETE CASCADE,
      room_code CHAR(6) NOT NULL REFERENCES ww_rooms(code) ON DELETE CASCADE,
      ready BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS ww_room_members_room_idx ON ww_room_members(room_code);
    ALTER TABLE ww_rooms ADD COLUMN IF NOT EXISTS bot_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE ww_rooms ADD COLUMN IF NOT EXISTS role_state JSONB;
    ALTER TABLE ww_rooms ADD COLUMN IF NOT EXISTS role_config JSONB;
    ALTER TABLE ww_rooms ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    CREATE INDEX IF NOT EXISTS ww_rooms_activity_idx ON ww_rooms(last_active_at);
    ALTER TABLE ww_rooms ADD COLUMN IF NOT EXISTS capacity INTEGER NOT NULL DEFAULT 10 CHECK (capacity BETWEEN 5 AND 20);
    -- Xóa bảng của các tính năng lưu ván và chat đã bỏ.
    DROP TABLE IF EXISTS ww_saves;
    DROP TABLE IF EXISTS ww_room_messages;
    UPDATE ww_room_members SET ready=FALSE WHERE room_code IN
      (SELECT code FROM ww_rooms WHERE role_state->>'phase'='ended');
    UPDATE ww_rooms SET role_state=NULL WHERE role_state->>'phase'='ended';
  `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}
