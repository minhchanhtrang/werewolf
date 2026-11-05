export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 20;

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
