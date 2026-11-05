import { randomUUID } from "node:crypto";

const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };

export function settleReplay(game, now = Date.now()) {
  const vote = game?.replayVote;
  if (!vote || vote.status !== "open") return vote?.status === "approved";
  const yes = vote.voters.filter(id => vote.votes[id] === true).length;
  if (yes > vote.voters.length / 2) vote.status = "approved";
  else if (now >= vote.deadline || vote.voters.every(id => Object.hasOwn(vote.votes, id))) vote.status = "rejected";
  return vote.status === "approved";
}

export function requestReplay(game, hostId, memberIds, now = Date.now()) {
  if (!game || game.phase === "ended") fail("Không có ván đang chơi.");
  settleReplay(game, now);
  if (game.replayVote?.status === "open") fail("Cả phòng đang biểu quyết chơi lại.");
  const voters = memberIds.filter(id => game.players.some(p => p.id === id && !p.bot));
  if (!voters.includes(hostId)) fail("Bạn không thuộc ván này.");
  game.replayVote = { id: randomUUID(), deadline: now + 30000, voters, votes: { [hostId]: true }, status: "open" };
  return settleReplay(game, now);
}

export function voteReplay(game, userId, input, now = Date.now()) {
  const vote = game?.replayVote;
  settleReplay(game, now);
  if (!vote || vote.status !== "open" || input.voteId !== vote.id || input.gameId !== game.id) fail("Yêu cầu chơi lại đã kết thúc hoặc thay đổi.");
  if (!vote.voters.includes(userId)) fail("Bạn không có quyền biểu quyết trong ván này.");
  if (typeof input.agree !== "boolean") fail("Lựa chọn biểu quyết không hợp lệ.");
  vote.votes[userId] = input.agree;
  return settleReplay(game, now);
}

export function replayView(game, userId) {
  const vote = game.replayVote;
  if (!vote) return null;
  return { id: vote.id, deadline: vote.deadline, status: vote.status,
    total: vote.voters.length, required: Math.floor(vote.voters.length / 2) + 1,
    yes: vote.voters.filter(id => vote.votes[id] === true).length,
    no: vote.voters.filter(id => vote.votes[id] === false).length,
    myVote: vote.votes[userId] ?? null, canVote: vote.voters.includes(userId) };
}
