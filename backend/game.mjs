import { randomInt, randomUUID } from "node:crypto";

const durations = { voting: 30000, revealed: 8000, night: 30000, witch: 20000, dawn: 8000 };
const choose = items => items.length ? items[randomInt(items.length)] : null;
const fail = message => { throw Object.assign(new Error(message), { status: 409 }); };

export function beginGame(deal, members, now = Date.now()) {
  // Xáo ngoại hình độc lập với vai; tối đa 10 người không trùng mẫu.
  const appearances = [];
  while (appearances.length < deal.players.length) {
    const batch = Array.from({ length: 10 }, (_, index) => index);
    for (let i = batch.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [batch[i], batch[j]] = [batch[j], batch[i]];
    }
    appearances.push(...batch);
  }
  return {
    ...deal, id: randomUUID(), version: 1, phase: "night", phaseId: 1, day: 1,
    phaseStartedAt: now, deadline: now + durations.night, winner: null,
    players: deal.players.map((player, index) => {
      const member = members.find(member => member.id === player.id);
      return { ...player, character: appearances[index], name: member.username, bot: Boolean(member.bot), alive: true };
    }),
    votes: {}, actions: {}, seerResults: {}, previousGuardTargetId: null,
    witchPotions: { heal: true, poison: true }, witchChoice: null, pendingAttackId: null,
    revealedVotes: [], history: [{ title: "Đêm 1", text: "Ván bắt đầu vào ban đêm. Hãy xem vai; Sói, Tiên tri và Bảo vệ thực hiện kỹ năng. Phù thủy hành động ở lượt kế tiếp." }],
    phaseNotice: "Đêm 1 bắt đầu. Hãy xem vai và thực hiện kỹ năng theo lượt. Chưa bỏ phiếu cho đến khi trời sáng."
  };
}

function log(game, text) {
  game.history.push({ title: (["night", "witch"].includes(game.phase) ? "Đêm " : "Ngày ") + game.day, text });
  game.history = game.history.slice(-100);
}

function winner(game) {
  const living = game.players.filter(player => player.alive);
  const wolves = living.filter(player => player.role === "wolf").length;
  if (wolves === 0) game.winner = "villagers";
  else if (wolves >= living.length - wolves) game.winner = "wolves";
  if (game.winner) {
    game.phase = "ended";
    game.deadline = null;
    game.phaseId++;
    log(game, game.winner === "wolves" ? "Phe Sói chiến thắng." : "Phe Dân chiến thắng.");
    game.phaseNotice = game.history.slice(-2).map(entry => entry.text).join(" ");
    return true;
  }
  return false;
}

function enter(game, phase, now) {
  const outcome = ["revealed", "dawn"].includes(phase) ? game.history.at(-1)?.text + " " : "";
  game.phase = phase;
  game.phaseId++;
  game.phaseStartedAt = now;
  game.deadline = now + durations[phase];
  const messages = {
    voting: "Ngày mới bắt đầu. Mọi người thảo luận và bỏ phiếu kín.",
    revealed: "Phiếu đã công bố. Chuẩn bị bước vào đêm.",
    night: "Đêm xuống. Người có kỹ năng thực hiện hành động theo vai của mình. Những người khác chờ bình minh.",
    witch: "Đêm chưa kết thúc. Chờ lượt Phù thủy trước khi công bố bình minh.",
    dawn: "Bình minh lên. Hãy xem kết quả đêm và chuẩn bị thảo luận."
  };
  game.phaseNotice = (outcome || "") + messages[phase];
  log(game, messages[phase]);
}

function topTarget(votes) {
  const counts = new Map();
  for (const target of Object.values(votes)) counts.set(target, (counts.get(target) || 0) + 1);
  const ranked = [...counts].sort((a, b) => b[1] - a[1]);
  if (!ranked.length || (ranked[1] && ranked[0][1] === ranked[1][1])) return null;
  return ranked[0][0];
}

export function act(game, userId, input) {
  if (!game || game.version !== 1) fail("Ván chưa bắt đầu. Hãy trở lại phòng chờ để bắt đầu ván mới.");
  if (input.phaseId !== game.phaseId) fail("Pha chơi đã thay đổi. Hãy chọn lại mục tiêu.");
  const actor = game.players.find(player => player.id === userId);
  const target = game.players.find(player => player.id === input.targetId);
  if (!actor?.alive) fail("Bạn đã bị loại và chỉ có thể theo dõi.");
  if (game.phase === "witch") {
    if (actor.role !== "witch") fail("Hiện là lượt riêng của Phù thủy.");
    if (game.witchChoice) fail("Bạn đã chốt lựa chọn cho đêm nay.");
    if (input.kind === "skip") { game.witchChoice = { kind: "skip" }; return; }
    if (!target?.alive) fail("Mục tiêu phải là người còn sống.");
    if (input.kind === "heal") {
      if (!game.witchPotions?.heal) fail("Bình cứu đã hết.");
      if (target.id !== game.pendingAttackId) fail("Chỉ cứu được người đang bị Sói tấn công.");
    } else if (input.kind === "poison") {
      if (!game.witchPotions?.poison) fail("Bình độc đã hết.");
      if (target.id === actor.id) fail("Không được tự dùng bình độc lên mình.");
    } else fail("Hãy chọn bình cứu, bình độc hoặc bỏ lượt.");
    game.witchChoice = { kind: input.kind, targetId: target.id };
    return;
  }
  if (!target?.alive) fail("Mục tiêu phải là người còn sống.");
  if (game.phase === "voting") {
    if (actor.id === target.id) fail("Không được tự bỏ phiếu cho mình.");
    game.votes[actor.id] = target.id;
    return;
  }
  if (game.phase !== "night") fail("Hiện chưa thể thực hiện hành động.");
  if (!["wolf", "seer", "guard"].includes(actor.role)) fail("Bạn không có hành động trong lượt này.");
  if (actor.role === "wolf" && target.role === "wolf") fail("Sói không được tấn công đồng đội.");
  if (actor.role === "guard" && target.id === game.previousGuardTargetId) fail("Không được bảo vệ cùng người hai đêm liên tiếp.");
  if (actor.role === "seer") {
    if (actor.id === target.id) fail("Tiên tri không tự soi mình.");
    if (Object.hasOwn(game.actions, actor.id)) fail("Tiên tri chỉ được soi một lần mỗi đêm.");
    game.seerResults[actor.id] = { day: game.day, text: target.name + (target.role === "wolf" ? " là Sói." : " không phải Sói.") };
  }
  game.actions[actor.id] = target.id;
}

function botsAct(game) {
  for (const bot of game.players.filter(player => player.bot && player.alive)) {
    let candidates = game.players.filter(player => player.alive);
    if (game.phase === "voting") {
      if (Object.hasOwn(game.votes, bot.id)) continue;
      candidates = candidates.filter(player => player.id !== bot.id && (bot.role !== "wolf" || player.role !== "wolf"));
    } else if (game.phase === "night") {
      if (!["wolf", "seer", "guard"].includes(bot.role) || Object.hasOwn(game.actions, bot.id)) continue;
      candidates = candidates.filter(player => bot.role === "wolf" ? player.role !== "wolf"
        : bot.role === "seer" ? player.id !== bot.id : player.id !== game.previousGuardTargetId);
      // Sói bot cùng nhắm một mục tiêu nếu đồng đội đã chọn, tránh tự chia phiếu vô nghĩa.
      if (bot.role === "wolf") {
        const teammate = game.players.find(player => player.alive && player.role === "wolf" && Object.hasOwn(game.actions, player.id));
        if (teammate) candidates = candidates.filter(player => player.id === game.actions[teammate.id]);
      }
    } else if (game.phase === "witch") {
      if (bot.role !== "witch" || game.witchChoice) continue;
      const victim = game.players.find(player => player.id === game.pendingAttackId && player.alive);
      if (victim && game.witchPotions?.heal) act(game, bot.id, { phaseId: game.phaseId, kind: "heal", targetId: victim.id });
      else {
        const target = game.witchPotions?.poison ? choose(candidates.filter(player => player.id !== bot.id)) : null;
        act(game, bot.id, { phaseId: game.phaseId, kind: target ? "poison" : "skip", targetId: target?.id });
      }
      continue;
    } else continue;
    const target = choose(candidates);
    if (target) act(game, bot.id, { phaseId: game.phaseId, targetId: target.id });
  }
}

function resolveNight(game, now) {
  const choice = game.witchChoice;
  const deaths = new Set();
  if (game.pendingAttackId !== null && game.pendingAttackId !== undefined && choice?.kind !== "heal") deaths.add(game.pendingAttackId);
  if (choice?.kind === "heal") game.witchPotions.heal = false;
  if (choice?.kind === "poison") {
    game.witchPotions.poison = false;
    deaths.add(choice.targetId);
  }
  const victims = game.players.filter(player => player.alive && deaths.has(player.id));
  for (const player of victims) player.alive = false;
  // Không công khai ai được cứu, loại bình hay danh tính người dùng kỹ năng.
  log(game, victims.length ? victims.map(player => player.name).join(", ") + " đã chết trong đêm." : "Đêm qua không ai bị loại.");
  game.pendingAttackId = null;
  if (!winner(game)) enter(game, "dawn", now);
}

// Cả worker server và request dùng chung hàm này, dưới khóa hàng PostgreSQL.
export function advanceGame(game, now = Date.now()) {
  if (!game || game.version !== 1 || game.phase === "ended") return false;
  const before = JSON.stringify(game);
  for (let i = 0; i < 64 && game.phase !== "ended"; i++) {
    if (now >= game.phaseStartedAt + 3000) botsAct(game);
    if (now < game.deadline) break;
    const at = game.deadline;
    if (game.phase === "voting") {
      const votes = Object.fromEntries(Object.entries(game.votes).filter(([actorId, targetId]) =>
        game.players.some(player => player.id === Number(actorId) && player.alive)
        && game.players.some(player => player.id === targetId && player.alive)));
      const targetId = topTarget(votes);
      const target = game.players.find(player => player.id === targetId);
      game.revealedVotes = Object.entries(votes).map(([id, target]) => [Number(id), target]);
      if (target) target.alive = false;
      log(game, target ? target.name + " bị loại sau bỏ phiếu." : "Hòa phiếu hoặc không có phiếu. Không ai bị loại.");
      if (!winner(game)) enter(game, "revealed", at);
    } else if (game.phase === "revealed") {
      game.day++;
      game.actions = {};
      game.witchChoice = null;
      game.pendingAttackId = null;
      game.revealedVotes = [];
      enter(game, "night", at);
    } else if (game.phase === "night") {
      const wolves = Object.fromEntries(game.players.filter(player => player.alive && player.role === "wolf" && Object.hasOwn(game.actions, player.id)
        && game.players.some(target => target.id === game.actions[player.id] && target.alive)).map(player => [player.id, game.actions[player.id]]));
      const targetId = topTarget(wolves);
      const guard = game.players.find(player => player.alive && player.role === "guard");
      const protectedId = guard ? game.actions[guard.id] ?? null : null;
      game.previousGuardTargetId = protectedId;
      const target = game.players.find(player => player.id === targetId);
      game.pendingAttackId = target && target.id !== protectedId ? target.id : null;
      const witch = game.players.find(player => player.alive && player.role === "witch");
      if (witch && (game.witchPotions?.heal || game.witchPotions?.poison)) enter(game, "witch", at);
      else resolveNight(game, at);
    } else if (game.phase === "witch") {
      resolveNight(game, at);
    } else if (game.phase === "dawn") {
      game.votes = {};
      enter(game, "voting", at);
    } else break;
  }
  return before !== JSON.stringify(game);
}

export function gameView(game, userId) {
  const me = game.players.find(player => player.id === userId);
  return {
    id: game.id, phase: game.phase, phaseId: game.phaseId, day: game.day, startedAt: game.startedAt,
    phaseNotice: game.phaseNotice || null,
    isTest: game.isTest, myRole: me?.role || null, selfAlive: Boolean(me?.alive),
    deadline: game.deadline, serverNow: Date.now(), winner: game.winner,
    roster: game.players.map(player => ({
      id: player.id, name: player.name, character: player.character, bot: player.bot, alive: player.alive,
      ...(game.phase === "ended" ? { role: player.role } : {})
    })),
    wolfIds: me?.role === "wolf" ? game.players.filter(player => player.role === "wolf").map(player => player.id) : [],
    myVote: game.phase === "voting" ? game.votes[userId] ?? null : null,
    myAction: game.phase === "night" ? game.actions[userId] ?? null : null,
    previousGuardTargetId: me?.role === "guard" ? game.previousGuardTargetId : null,
    seerResult: me?.role === "seer" ? game.seerResults[userId] || null : null,
    witch: me?.role === "witch" ? {
      heal: Boolean(game.witchPotions?.heal), poison: Boolean(game.witchPotions?.poison),
      victimId: me.alive && game.phase === "witch" ? game.pendingAttackId : null,
      choice: game.phase === "witch" ? game.witchChoice : null
    } : null,
    voteCount: game.phase === "voting" ? Object.keys(game.votes).length : null,
    revealedVotes: game.revealedVotes, history: game.history
  };
}

export function leaveGame(game, userId) {
  if (game?.version !== 1 || game.phase === "ended") return;
  const player = game.players.find(player => player.id === userId);
  if (!player?.alive) return;
  player.alive = false;
  delete game.votes[userId];
  delete game.actions[userId];
  if (player.role === "witch") game.witchChoice = null;
  log(game, player.name + " rời ván và bị loại.");
  winner(game);
}
