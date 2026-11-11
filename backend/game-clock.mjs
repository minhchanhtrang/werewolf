import { advanceGame } from "./game.mjs";
import { persistGame, pruneResults, activeRooms, forgetResult } from "./game-storage.mjs";
import { pruneAbandonedRooms, trackedRooms, refreshTrackedRooms } from "./room-cleanup.mjs";
import { pruneDisconnectedMembers } from './presence.mjs';

export async function advanceRoom(pool, code, now) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT role_state FROM ww_rooms WHERE code=$1 FOR UPDATE SKIP LOCKED", [code]);
    const game = result.rows[0]?.role_state;
    if (!result.rows.length) {
      const exists = await client.query("SELECT 1 FROM ww_rooms WHERE code=$1", [code]);
      if (!exists.rows.length) forgetResult(code);
    }
    if (result.rows.length && !game) activeRooms.delete(code);
    if (advanceGame(game, now ?? Date.now()) || game?.phase === "ended") await persistGame(client, code, game);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

export function createClockTick(pool) {
  let initialized = false;
  let running = false;
  let lastCleanup = 0;
  let lastPresenceCleanup = 0;
  return async () => {
    if (running) return;
    running = true;
    pruneResults();
    try {
      if (!initialized) {
        const rooms = await pool.query("SELECT code,role_state->>'version' AS version FROM ww_rooms");
        for (const room of rooms.rows) {
          trackedRooms.add(room.code);
          if (room.version === "1") activeRooms.add(room.code);
        }
        initialized = true;
      }
      if (trackedRooms.size && Date.now() - lastPresenceCleanup >= 2000) {
        await pruneDisconnectedMembers(pool);
        lastPresenceCleanup = Date.now();
      }
      if (trackedRooms.size && Date.now() - lastCleanup >= 30000) {
        await pruneAbandonedRooms(pool);
        await refreshTrackedRooms(pool);
        lastCleanup = Date.now();
      }
      for (const code of [...activeRooms]) await advanceRoom(pool, code);
    } catch { console.error("Đồng hồ phòng tạm gián đoạn; sẽ tự thử lại."); }
    finally { running = false; }
  };
}

export function startGameClock(pool) {
  if (!pool) return;
  const timer = setInterval(createClockTick(pool), 1000);
  timer.unref();
  return timer;
}
