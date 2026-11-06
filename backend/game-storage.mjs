// Kết quả chỉ nằm trong RAM tối đa 60 giây, không lưu lịch sử trận.
import { clearWolfChat } from "./wolf-chat.mjs";
import { clearVillageChat } from "./village-chat.mjs";
function clearChats(id) { clearWolfChat(id); clearVillageChat(id); }
const results = new Map();
const RESULT_TTL = 60000;
export const activeRooms = new Set();

export function finishedResult(code, now = Date.now()) {
  const result = results.get(code);
  if (result && result.expires > now) return result.game;
  results.delete(code);
  return null;
}

const gameIds = new Map();
export function forgetResult(code) { clearChats(gameIds.get(code)); gameIds.delete(code); results.delete(code); activeRooms.delete(code); }

export function pruneResults(now = Date.now()) {
  for (const code of results.keys()) finishedResult(code, now);
}

export async function persistGame(db, code, game) {
  if (game?.phase !== "ended") {
    if (gameIds.get(code) !== game.id) clearChats(gameIds.get(code));
    gameIds.set(code, game.id);
    await db.query("UPDATE ww_rooms SET role_state=$1::jsonb WHERE code=$2", [JSON.stringify(game), code]);
    activeRooms.add(code);
    return;
  }
  await db.query("UPDATE ww_rooms SET role_state=NULL WHERE code=$1", [code]);
  clearChats(game.id);
  gameIds.delete(code);
  await db.query("UPDATE ww_room_members SET ready=FALSE WHERE room_code=$1", [code]);
  results.set(code, { game: structuredClone(game), expires: Date.now() + RESULT_TTL });
  activeRooms.delete(code);
}
