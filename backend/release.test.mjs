import test from "node:test";
import assert from "node:assert/strict";
import { beginGame, act, advanceGame, gameView } from "./game.mjs";
import { dealRoles } from "./roles.mjs";
import { roleCounts, canStartRoom } from "../js/rules.js";
import { allowedOrigin } from "./origin.mjs";

function fixture() {
  const roles = ["wolf", "seer", "witch", "guard", "villager", "villager", "villager"];
  const members = roles.map((role, i) => ({ id: i + 1, username: "P" + i }));
  const game = beginGame({ players: roles.map((role, i) => ({ id: i + 1, role })) }, members, 0);
  advanceGame(game,game.deadline);
  return game;
}
const next = game => advanceGame(game, game.deadline);
const action = (game, id, targetId, kind) => act(game, id, { phaseId: game.phaseId, targetId, kind });

test("Bắt đầu Đêm 1 theo lượt; Phù thủy có thể tự cứu", () => {
  const game = fixture();
  assert.equal(game.phase, "guard"); next(game);
  action(game, 1, 3); next(game);
  assert.equal(game.phase, "seer"); next(game);
  assert.equal(game.phase, "witch");
  assert.equal(gameView(game, 3).witch.canHeal, true);
  assert.equal(gameView(game, 2).witch, null);
  action(game, 3, 3, "heal");
  assert.throws(() => action(game, 3, 3, "heal"));
  next(game); assert.ok(game.players[2].alive); assert.equal(game.witchPotions.heal, false);
  assert.equal(game.phase, "dawn"); next(game);
  assert.equal(game.phase, "voting"); assert.equal(game.day, 1);
  next(game); next(game); assert.equal(game.phase, "guard"); assert.equal(game.day, 2);
});

test("Bình độc xuyên bảo vệ; Sói tấn công và bình độc giải quyết đồng thời", () => {
  const game = fixture(); action(game, 4, 6); next(game); action(game, 1, 5); next(game); next(game);
  action(game, 3, 6, "poison"); next(game);
  assert.equal(game.players[4].alive, false); assert.equal(game.players[5].alive, false);
  assert.equal(game.witchPotions.poison, false);
});

test("Chia vai 5–20 người, mỗi ván một Phù thủy; tối thiểu 5 người sẵn sàng", () => {
  for (let n = 5; n <= 20; n++) {
    const members = Array.from({ length: n }, (_, id) => ({ id, username: "P" + id, ready: true }));
    const game = beginGame(dealRoles(members), members);
    assert.equal(game.players.filter(p => p.role === "witch").length, 1);
    assert.equal(Object.values(roleCounts(n)).reduce((a,b) => a+b,0), n);
    assert.ok(canStartRoom(members, 20));
    if (n <= 10) assert.equal(new Set(game.players.map(p => p.character)).size, n);
  }
  assert.equal(canStartRoom(Array(4).fill({ ready: true }), 20), false);
  assert.equal(canStartRoom(Array(5).fill({ ready: false }), 20), true);
  assert.throws(() => roleCounts(4)); assert.throws(() => roleCounts(21));
});

test("Deploy HTTPS chỉ chấp nhận đúng APP_ORIGIN", () => {
  const previous = process.env.APP_ORIGIN;
  try {
    process.env.APP_ORIGIN = "https://game.example.com";
    assert.ok(allowedOrigin({ headers: { origin: "https://game.example.com", host: "internal:10000" } }));
    assert.equal(allowedOrigin({ headers: { origin: "https://evil.example.com", host: "internal:10000" } }), false);
  } finally { if (previous === undefined) delete process.env.APP_ORIGIN; else process.env.APP_ORIGIN = previous; }
});
