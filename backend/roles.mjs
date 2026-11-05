import { randomInt } from "node:crypto";
import { gameView } from "./game.mjs";
import { roleCounts } from "../js/rules.js";

export function dealRoles(members) {
  const counts = roleCounts(members.length);
  const roles = Object.entries(counts).flatMap(([role, count]) => Array(count).fill(role));
  for (let i = roles.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }
  return {
    startedAt: new Date().toISOString(),
    isTest: members.some(member => member.bot),
    players: members.map((member, index) => ({ id: member.id, role: roles[index] }))
  };
}

// Không bao giờ gửi danh sách vai riêng tư của cả phòng xuống trình duyệt.
export function privateRoleView(game, userId) {
  if (game?.version === 1) return gameView(game, userId);
  return game ? {
    phase: "roles", startedAt: game.startedAt, isTest: game.isTest,
    myRole: game.players.find(player => player.id === userId)?.role || null
  } : null;
}
