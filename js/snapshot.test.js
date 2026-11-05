import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { players } from "./data.js";
import * as game from "./state.js";

beforeEach(() => game.clearVotes());

test("Khôi phục vai, người chết, phiếu kín và thời hạn bỏ phiếu", () => {
  players[9].alive = false;
  game.startVoting();
  game.selectPlayer(1);
  game.toggleTargetSelection();
  game.selectPlayer(2);
  const saved = JSON.parse(JSON.stringify(game.createSnapshot()));
  game.clearVotes();
  game.restoreSnapshot(saved);
  assert.equal(players[9].alive, false);
  assert.equal(game.state.pendingVotes.get(1), 2);
  assert.equal(game.state.votes.size, 0);
  assert.equal(game.state.votingEndsAt, saved.state.votingEndsAt);
  assert.deepEqual(players.map(p => p.role), saved.players.map(p => p.role));
});

test("Mở lại ván quá hạn công bố đúng một lần", () => {
  game.startVoting(1000);
  const saved = game.createSnapshot();
  game.clearVotes();
  game.restoreSnapshot(saved);
  assert.equal(game.state.phase, "revealed");
  assert.equal(game.state.history.length, 1);
  assert.equal(game.expireVoting(), false);
});

test("Khôi phục đủ hành động đêm và lịch sử bảo vệ", () => {
  game.startVoting(); game.revealVotes(); game.startNight();
  game.state.nightTargetId = 5;
  game.state.guardTargetId = 5;
  game.state.previousGuardTargetId = 6;
  game.state.seerUsed = true;
  game.state.seerResult = "Kết quả thử";
  const saved = game.createSnapshot();
  game.clearVotes(); game.restoreSnapshot(saved);
  assert.equal(game.state.sleeping, true);
  assert.equal(game.state.guardTargetId, 5);
  assert.equal(game.state.previousGuardTargetId, 6);
  assert.equal(game.state.seerUsed, true);
  assert.equal(game.state.seerResult, "Kết quả thử");
});

test("Dữ liệu hỏng không thay đổi ván hiện tại", () => {
  const before = game.createSnapshot();
  const invalid = structuredClone(before);
  invalid.players[0].id = 999;
  assert.throws(() => game.restoreSnapshot(invalid));
  assert.deepEqual(game.createSnapshot(), before);
  const duplicate = structuredClone(before);
  duplicate.state.pendingVotes = [[1, 2], [1, 3]];
  assert.throws(() => game.restoreSnapshot(duplicate));
});
