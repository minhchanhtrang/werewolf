import { advanceGame } from "./game.mjs";
import { persistGame, pruneResults, activeRooms } from "./game-storage.mjs";

export async function advanceRoom(pool, code, now = Date.now()) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT role_state FROM ww_rooms WHERE code=$1 FOR UPDATE SKIP LOCKED", [code]);
    const game = result.rows[0]?.role_state;
    if (result.rows.length && !game) activeRooms.delete(code);
    if (advanceGame(game, now) || game?.phase === "ended") await persistGame(client, code, game);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export function startGameClock(pool) {
  if (!pool) return;
  let initialized = false;
  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    pruneResults();
    try {
      if (!initialized) {
        const rooms = await pool.query("SELECT code FROM ww_rooms WHERE role_state->>'version'='1'");
        for (const room of rooms.rows) activeRooms.add(room.code);
        initialized = true;
      }
      for (const code of [...activeRooms]) await advanceRoom(pool, code);
    } catch { console.error("Đồng hồ phòng tạm gián đoạn; sẽ tự thử lại."); }
    finally { running = false; }
  }, 1000);
  timer.unref();
  return timer;
}
