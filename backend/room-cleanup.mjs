import { forgetResult } from "./game-storage.mjs";

// Polling counts as activity, including requests answered with HTTP 304.
export async function touchRoom(db, code) {
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
  for (const room of result.rows) forgetResult(room.code);
  return result.rows.length;
}
