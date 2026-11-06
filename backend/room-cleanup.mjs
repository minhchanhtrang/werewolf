import { forgetResult } from "./game-storage.mjs";
export const trackedRooms = new Set();

// Polling counts as activity, including requests answered with HTTP 304.
export async function touchRoom(db, code) {
  trackedRooms.add(code);
  await db.query(`UPDATE ww_rooms SET last_active_at=NOW()
    WHERE code=$1 AND last_active_at < NOW()-INTERVAL '30 seconds'`, [code]);
}

export async function pruneAbandonedRooms(pool) {
  const result = await pool.query(`WITH abandoned AS (
    SELECT code FROM ww_rooms
    WHERE last_active_at < NOW()-INTERVAL '10 minutes'
    ORDER BY last_active_at LIMIT 100 FOR UPDATE SKIP LOCKED
  ) DELETE FROM ww_rooms r USING abandoned a
    WHERE r.code=a.code RETURNING r.code`);
  for (const room of result.rows) { forgetResult(room.code); trackedRooms.delete(room.code); }
  return result.rows.length;
}

export async function refreshTrackedRooms(pool) {
  const checked = [...trackedRooms];
  if (!checked.length) return;
  const result = await pool.query("SELECT code FROM ww_rooms WHERE code=ANY($1::text[])", [checked]);
  const existing = new Set(result.rows.map(room => room.code));
  for (const code of checked) if (!existing.has(code)) { trackedRooms.delete(code); forgetResult(code); }
}
