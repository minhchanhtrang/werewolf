import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { players } from "./data.js";
import * as game from "./state.js";

beforeEach(() => {
  game.clearVotes();
  // Bộ vai cố định để kiểm tra luật, không phụ thuộc kết quả xáo trộn.
  players.forEach((player, index) => {
    player.role = index < 2 ? "wolf" : index === 2 ? "seer" : index === 3 ? "guard" : "villager";
  });
});

function act(actorId, targetId) {
  game.selectPlayer(actorId);
  game.toggleTargetSelection();
  game.selectPlayer(targetId);
}

function night() {
  game.startVoting();
  game.revealVotes();
  game.startNight();
}

test("Phiếu kín, hòa không loại, nhật ký chỉ ghi khi công bố", () => {
  game.startVoting();
  act(1, 2);
  act(2, 1);
  assert.equal(game.state.votes.size, 0);
  assert.equal(game.state.history.length, 0);
  game.revealVotes();
  assert.equal(game.state.votes.size, 2);
  assert.ok(players.every(player => player.alive));
  assert.equal(game.state.history.length, 1);
});

test("Hết đúng 30 giây công bố một lần; đặt lại xóa hạn", () => {
  game.startVoting(1000);
  assert.equal(game.expireVoting(30999), false);
  assert.equal(game.expireVoting(31000), true);
  assert.equal(game.expireVoting(32000), false);
  assert.equal(game.state.history.length, 1);
  game.clearVotes();
  assert.equal(game.state.votingEndsAt, null);
  assert.equal(game.state.history.length, 0);
});

test("Tiên tri không tự soi và chỉ soi một lần mỗi đêm", () => {
  night();
  act(3, 3);
  assert.equal(game.state.seerUsed, false);
  game.selectPlayer(1);
  assert.equal(game.state.seerResult, "Người 1 là Sói.");
  game.toggleTargetSelection();
  assert.equal(game.state.choosingTarget, false);
  game.resolveNight();
  assert.equal(game.state.seerResult, "");
  night();
  assert.equal(game.state.seerUsed, false);
});

test("Bảo vệ cứu nạn nhân, không chọn lại trong đêm kế tiếp", () => {
  night();
  act(4, 3);
  act(1, 3);
  assert.equal(players[2].alive, true);
  game.resolveNight();
  assert.equal(players[2].alive, true);
  assert.equal(game.state.day, 2);
  night();
  act(4, 3);
  assert.equal(game.state.guardTargetId, null);
  game.selectPlayer(4);
  assert.equal(game.state.guardTargetId, 4);
  act(1, 4);
  game.resolveNight();
  assert.equal(players[3].alive, true);
});

test("Người chết không bỏ phiếu; hết Sói thì khóa ván", () => {
  players[0].alive = false;
  game.startVoting();
  game.selectPlayer(1);
  assert.equal(game.state.selectedPlayerId, null);
  act(3, 2);
  game.revealVotes();
  assert.equal(game.state.winner, "villagers");
  game.startNight();
  game.startVoting();
  assert.equal(game.state.phase, "ended");
});

test("Sói thắng khi đạt ngang số phe Dân sau đêm", () => {
  night();
  players.slice(5).forEach(player => { player.alive = false; });
  act(1, 5);
  game.resolveNight();
  assert.equal(game.state.winner, "wolves");
  assert.equal(game.state.phase, "ended");
});
