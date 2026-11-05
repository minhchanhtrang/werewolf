// Cùng một bộ kiểm tra dữ liệu cho trình duyệt và server.
export function validateSnapshot(value) {
  const fail = () => { throw new Error("Bản lưu không hợp lệ hoặc không tương thích."); };
  if (!value || value.version !== 1 || !Array.isArray(value.players) || value.players.length !== 10) fail();
  const ids = new Set();
  const roles = { wolf: 0, seer: 0, guard: 0, villager: 0 };
  const players = value.players.map(player => {
    if (!player || !Number.isInteger(player.id) || player.id < 1 || player.id > 10 || ids.has(player.id) || typeof player.alive !== "boolean" || !Object.hasOwn(roles, player.role)) fail();
    ids.add(player.id);
    roles[player.role]++;
    return { id: player.id, alive: player.alive, role: player.role };
  });
  if (roles.wolf !== 2 || roles.seer !== 1 || roles.guard !== 1 || roles.villager !== 6) fail();
  const source = value.state;
  if (!source || !["idle", "day", "voting", "revealed", "night", "ended"].includes(source.phase)) fail();
  if (!Number.isInteger(source.day) || source.day < 1 || source.day > 10000) fail();
  if (![null, "villagers", "wolves"].includes(source.winner) || (source.phase === "ended") !== (source.winner !== null)) fail();
  const state = { phase: source.phase, day: source.day, winner: source.winner };
  for (const key of ["showRoles", "seerUsed", "sleeping", "choosingTarget"]) {
    if (typeof source[key] !== "boolean") fail();
    state[key] = source[key];
  }
  if (state.sleeping !== (state.phase === "night")) fail();
  for (const key of ["selectedPlayerId", "nightTargetId", "guardTargetId", "previousGuardTargetId"]) {
    if (source[key] !== null && !ids.has(source[key])) fail();
    state[key] = source[key];
  }
  if (source.phase === "voting" ? !Number.isSafeInteger(source.votingEndsAt) || source.votingEndsAt <= 0 : source.votingEndsAt !== null) fail();
  state.votingEndsAt = source.votingEndsAt;
  for (const key of ["message", "result", "seerResult"]) {
    if (typeof source[key] !== "string" || source[key].length > 3000) fail();
    state[key] = source[key];
  }
  for (const key of ["pendingVotes", "votes"]) {
    if (!Array.isArray(source[key]) || source[key].length > 10) fail();
    const voters = new Set();
    state[key] = source[key].map(pair => {
      if (!Array.isArray(pair) || pair.length !== 2 || !ids.has(pair[0]) || !ids.has(pair[1]) || pair[0] === pair[1] || voters.has(pair[0])) fail();
      voters.add(pair[0]);
      return [pair[0], pair[1]];
    });
  }
  if (!Array.isArray(source.history) || source.history.length > 100) fail();
  state.history = source.history.map(entry => {
    if (!entry || typeof entry.title !== "string" || entry.title.length > 100 || typeof entry.text !== "string" || entry.text.length > 3000) fail();
    return { title: entry.title, text: entry.text };
  });
  return { version: 1, players, state };
}
