import test from "node:test";
import assert from "node:assert/strict";
import { beginGame, act, advanceGame, gameView, leaveGame } from "./game.mjs";

function fixture() {
  const members = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, username: "Player " + (i + 1), bot: false }));
  const roles = ["wolf", "wolf", "seer", "guard", ...Array(6).fill("villager")];
  const game = beginGame({ startedAt: new Date(1000).toISOString(), isTest: false, players: members.map((member, i) => ({ id: member.id, role: roles[i] })) }, members, 1000);
  // Các ca bên dưới kiểm tra từ một lượt bỏ phiếu đang diễn ra.
  game.phase = "voting";
  return game;
}
const action = (game, id, targetId) => act(game, id, { phaseId: game.phaseId, targetId });
const next = game => advanceGame(game, game.deadline);

test("Phiếu kín, chỉ nhận hành động đúng pha và không tự vote", () => {
  const game = fixture();
  action(game, 3, 1);
  assert.equal(gameView(game, 3).myVote, 1);
  assert.equal(gameView(game, 4).myVote, null);
  assert.equal(gameView(game, 4).revealedVotes.length, 0);
  assert.equal("votes" in gameView(game, 4), false);
  assert.throws(() => action(game, 3, 3));
  assert.throws(() => act(game, 3, { phaseId: 999, targetId: 1 }));
  next(game);
  assert.equal(game.phase, "revealed");
  assert.equal(game.players[0].alive, false);
  assert.deepEqual(gameView(game, 4).revealedVotes, [[3, 1]]);
  assert.throws(() => action(game, 1, 3));
});

test("Đêm: soi riêng một lần, bảo vệ hiệu lực và cấm lặp hai đêm", () => {
  const game = fixture(); next(game); next(game);
  assert.equal(game.phase, "night");
  assert.throws(() => action(game, 1, 2));
  assert.throws(() => action(game, 5, 1));
  action(game, 3, 1);
  assert.match(gameView(game, 3).seerResult.text, /là Sói/);
  assert.equal(gameView(game, 1).seerResult, null);
  assert.throws(() => action(game, 3, 2));
  action(game, 4, 3); action(game, 1, 3); action(game, 2, 3);
  next(game);
  assert.equal(game.players[2].alive, true);
  assert.equal(game.previousGuardTargetId, 3);
  next(game); next(game); next(game);
  assert.equal(game.phase, "night");
  assert.throws(() => action(game, 4, 3));
  action(game, 4, 4); action(game, 3, 2);
});

test("Hòa phiếu và Sói bất đồng không loại người", () => {
  const game = fixture(); action(game, 3, 1); action(game, 4, 2); next(game);
  assert.ok(game.players.every(player => player.alive));
  next(game); action(game, 1, 3); action(game, 2, 4); next(game);
  assert.ok(game.players.every(player => player.alive));
});

test("Trọn ván: Dân thắng, chỉ công khai vai lúc kết thúc", () => {
  const game = fixture();
  assert.ok(gameView(game, 3).roster.every(player => !("role" in player)));
  assert.deepEqual(gameView(game, 1).wolfIds, [1, 2]);
  assert.deepEqual(gameView(game, 3).wolfIds, []);
  action(game, 3, 1); next(game); next(game); next(game); next(game);
  assert.equal(game.day, 2);
  action(game, 3, 2); next(game);
  assert.equal(game.phase, "ended"); assert.equal(game.winner, "villagers");
  assert.equal(game.deadline, null);
  assert.ok(gameView(game, 3).roster.every(player => player.role));
  const copy = JSON.stringify(game); advanceGame(game, 1e9);
  assert.equal(JSON.stringify(game), copy);
});

test("Sói thắng khi bằng số phe Dân; rời ván bị loại", () => {
  const game = fixture();
  for (let id = 5; id <= 10; id++) leaveGame(game, id);
  assert.equal(game.winner, "wolves");
  assert.equal(game.phase, "ended");
});

test("Bot tự vote sau 3 giây, không lặp phiếu và không tự vote", () => {
  const game = fixture(); game.players.slice(2).forEach(player => { player.bot = true; });
  advanceGame(game, 3999); assert.equal(Object.keys(game.votes).length, 0);
  advanceGame(game, 4000); assert.equal(Object.keys(game.votes).length, 8);
  for (const [id, target] of Object.entries(game.votes)) assert.notEqual(Number(id), target);
  const copy = JSON.stringify(game.votes); advanceGame(game, 5000);
  assert.equal(JSON.stringify(game.votes), copy);
});

test("Bot dùng kỹ năng đúng vai vào ban đêm", () => {
  const game = fixture();
  game.phase = "night";
  game.previousGuardTargetId = 3;
  game.players.slice(0, 8).forEach(player => { player.bot = true; });
  advanceGame(game, 4000);
  assert.equal(Object.keys(game.actions).length, 4);
  assert.ok(![1, 2].includes(game.actions[1]));
  assert.equal(game.actions[1], game.actions[2]);
  assert.notEqual(game.actions[3], 3);
  assert.notEqual(game.actions[4], 3);
  assert.ok(game.seerResults[3]);
  const saved = JSON.stringify(game.actions);
  advanceGame(game, 5000);
  assert.equal(JSON.stringify(game.actions), saved);
});

test("Khôi phục thời gian cũ và không loại lại người đã rời", () => {
  const game = fixture(); action(game, 3, 5); leaveGame(game, 5);
  const persisted = JSON.parse(JSON.stringify(game));
  advanceGame(persisted, 39000);
  assert.equal(persisted.phase, "night");
  assert.equal(persisted.players.filter(player => !player.alive).length, 1);
  assert.ok(persisted.history.some(entry => /Không ai bị loại/.test(entry.text)));
});
