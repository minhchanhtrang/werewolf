export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;
export const ROLE_LABELS = { wolf: "Ma sói", villager: "Dân làng", seer: "Tiên tri", guard: "Bảo vệ", witch: "Phù thủy", hunter: "Thợ săn", idiot: "Thằng ngu" };
export function validateRoles(counts, count) {
  if (!counts || typeof counts !== "object" || Array.isArray(counts)) throw new RangeError("Cấu hình vai không hợp lệ.");
  if (Object.keys(counts).some(role => !Object.hasOwn(ROLE_LABELS, role))) throw new RangeError("Có vai không được hỗ trợ.");
  const result = Object.fromEntries(Object.keys(ROLE_LABELS).map(role => [role, counts[role] ?? 0]));
  for (const [role, n] of Object.entries(result)) {
    if (!Number.isInteger(n) || n < 0 || n > MAX_PLAYERS || (!["wolf", "villager"].includes(role) && n > 1)) throw new RangeError("Vai đặc biệt tối đa 1 người; số lượng phải là số nguyên không âm.");
  }
  if (Object.values(result).reduce((a,b) => a+b, 0) !== count) throw new RangeError("Tổng số vai phải bằng số người trong phòng.");
  if (count < MIN_PLAYERS || count > MAX_PLAYERS || result.wolf < 1 || result.wolf * 2 >= count) throw new RangeError("Cần 5–20 người, ít nhất 1 Sói và số Sói ít hơn phe Dân.");
  return result;
}

// Bộ luật mặc định của game; dùng chung cho bản xem trước và server.
export function roleCounts(count) {
  if (!Number.isInteger(count) || count < MIN_PLAYERS || count > MAX_PLAYERS) {
    throw new RangeError(`Số người phải từ ${MIN_PLAYERS} đến ${MAX_PLAYERS}.`);
  }
  const wolf = Math.floor(count / 4);
  const seer = 1;
  const guard = count >= 7 ? 1 : 0;
  const witch = 1;
  return { wolf, seer, guard, witch, villager: count - wolf - seer - guard - witch };
}

export function describeRoles(count) {
  const roles = roleCounts(count);
  return [`${roles.wolf} Sói`, `${roles.seer} Tiên tri`, ...(roles.guard ? [`${roles.guard} Bảo vệ`] : []), `${roles.witch} Phù thủy`, `${roles.villager} Dân`].join(" · ");
}

export function canStartRoom(members, capacity) {
  return members.length >= MIN_PLAYERS && members.length <= capacity && members.every(member => member.ready);
}
