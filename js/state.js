import { players } from "./data.js";
import { validateSnapshot } from "./snapshot.js";

export const state = {
  phase: "idle", // idle | voting | revealed | night | day | ended
  winner: null,
  day: 1,
  showRoles: true,
  history: [],
  votingEndsAt: null,
  nightTargetId: null,
  guardTargetId: null,
  previousGuardTargetId: null,
  seerUsed: false,
  seerResult: "",
  sleeping: false,
  selectedPlayerId: null,
  choosingTarget: false,

  pendingVotes: new Map(),
  votes: new Map(),

  message: "Bấm “Bắt đầu bỏ phiếu” để thử.",
  result: ""
};

export function startVoting(now = Date.now()) {
  if (!["idle", "day"].includes(state.phase) || state.winner !== null) return;
    if (players.filter(player => player.alive).length < 2) {
  state.message = "Không đủ người để bỏ phiếu. Hãy đặt lại.";
  return;
}
  state.phase = "voting";
  state.votingEndsAt = now + 30_000;
  state.sleeping = false;
  state.selectedPlayerId = null;
  state.choosingTarget = false;

  state.pendingVotes.clear();
  state.votes.clear();

  state.result = "";
  state.message =
    "Chọn người bỏ phiếu, sau đó bấm “Chọn mục tiêu”.";
}

export function selectPlayer(playerId) {
  if (expireVoting()) return;
  if (state.winner !== null) return;
const player = players.find(item => item.id === playerId);

if (!player) return;

if (!player.alive) {
  state.message = `${player.name} đã bị loại.`;
  return;
}

  if (state.phase === "night") {
    const actor = players.find(item => item.id === state.selectedPlayerId);
    if (state.choosingTarget) {
      if (!actor || !actor.alive) return;
      if (actor.role === "guard") {
        if (player.id === state.previousGuardTargetId) {
          state.message = "Không được bảo vệ cùng một người trong hai đêm liên tiếp.";
          return;
        }
        state.guardTargetId = player.id;
        state.choosingTarget = false;
        state.message = "Đã ghi nhận người được bảo vệ. Có thể đổi trước khi trời sáng.";
        return;
      }
      if (actor.role === "seer") {
        if (state.seerUsed) return;
        if (actor.id === player.id) {
          state.message = "Tiên tri phải soi một người khác.";
          return;
        }
        state.seerUsed = true;
        state.seerResult = player.name + (player.role === "wolf" ? " là Sói." : " không phải Sói.");
        state.choosingTarget = false;
        state.message = "Tiên tri đã soi xong. Xem kết quả trong khu vực Tiên tri.";
        return;
      }
      if (actor.role !== "wolf") return;
      if (player.role === "wolf") {
        state.message = "Sói chỉ được tấn công Dân còn sống.";
        return;
      }
      state.nightTargetId = player.id;
      state.choosingTarget = false;
      state.message = "Đã ghi nhận mục tiêu của bầy Sói. Có thể chọn lại trước khi sang sáng.";
    } else if (player.role === "guard") {
      state.selectedPlayerId = player.id;
      const previous = players.find(item => item.id === state.previousGuardTargetId);
      state.message = "Đã chọn Bảo vệ. Được tự bảo vệ, có thể đổi mục tiêu trước khi sáng."
        + (previous ? " Đêm nay không được chọn " + previous.name + "." : "");
    } else if (player.role === "seer") {
      state.selectedPlayerId = player.id;
      state.message = state.seerUsed
        ? "Tiên tri đã dùng lượt soi đêm nay."
        : "Đã chọn Tiên tri. Bấm “Soi một người”.";
    } else if (player.role === "wolf") {
      state.selectedPlayerId = player.id;
      state.message = "Đã chọn Sói. Bấm “Chọn mục tiêu” để tấn công.";
    } else {
      state.message = "Ban đêm, hãy chọn Sói, Tiên tri hoặc Bảo vệ còn sống trước.";
    }
    return;
  }

  if (state.choosingTarget) {
    if (state.phase !== "voting" || state.sleeping) return;

    if (playerId === state.selectedPlayerId) {
      state.message = "Hãy chọn một người khác.";
      return;
    }

    const actor = players.find(
      item => item.id === state.selectedPlayerId
    );

    if (!actor || !actor.alive) return;

    state.pendingVotes.set(actor.id, player.id);
    state.choosingTarget = false;

    // Không ghi mục tiêu vào thông báo công khai.
    state.message = `Đã ghi nhận phiếu của ${actor.name}.`;
    return;
  }

  state.selectedPlayerId = player.id;

  if (state.sleeping) {
    state.message = `Đã chọn ${player.name}. Mọi người đang ngủ.`;
  } else if (state.phase === "voting") {
    const hasVoted = state.pendingVotes.has(player.id);

    state.message = hasVoted
      ? `${player.name} đã bỏ phiếu. Có thể chọn lại mục tiêu.`
      : `${player.name}: bấm “Chọn mục tiêu” để bỏ phiếu.`;
  } else {
    state.message = `Đã chọn ${player.name}.`;
  }
}

export function toggleTargetSelection() {
  if (expireVoting()) return;
  if (state.phase === "night") {
    const actor = players.find(player => player.id === state.selectedPlayerId);
    if (!actor || !actor.alive || !["wolf", "seer", "guard"].includes(actor.role)) return;
    if (actor.role === "seer" && state.seerUsed) return;
    state.choosingTarget = !state.choosingTarget;
    state.message = state.choosingTarget
      ? actor.role === "seer"
        ? "Chọn một người khác còn sống để soi. Mỗi đêm chỉ được soi một lần."
        : actor.role === "guard"
          ? "Chọn người còn sống để bảo vệ. Được tự bảo vệ; không chọn lại người của đêm trước."
          : "Chọn một người phe Dân còn sống làm mục tiêu của bầy Sói."
      : "Đã hủy chọn mục tiêu.";
    return;
  }
  if (
    state.phase !== "voting" ||
    state.sleeping ||
    state.selectedPlayerId === null
  ) {
    return;
  }

  state.choosingTarget = !state.choosingTarget;

  state.message = state.choosingTarget
    ? "Bấm vào người bạn muốn bỏ phiếu."
    : "Đã hủy chọn mục tiêu.";
}

export function revealVotes() {
  if (state.phase !== "voting") return;

  // Chốt danh sách trước khi loại người để tính đúng vòng này.
  const livingPlayers = players.filter(player => player.alive);

  state.phase = "revealed";
  state.votingEndsAt = null;
  state.choosingTarget = false;
  state.votes = new Map(state.pendingVotes);

  state.message = "Đã công bố phiếu của tất cả người chơi.";
  state.result = summarizeVotes(livingPlayers);
  checkWinner();
  state.history.push({ title: "Bỏ phiếu · Ngày " + state.day, text: state.result });
}

function summarizeVotes(livingPlayers) {
  const counts = new Map();

  state.votes.forEach(targetId => {
    counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
  });

  const missingVotes = livingPlayers.length - state.votes.size;

  if (counts.size === 0) {
    return "Không có phiếu nào. Không ai bị loại.";
  }

  const ranking = [...counts.entries()].sort(
    (first, second) => second[1] - first[1]
  );

  const highestCount = ranking[0][1];

  const leaders = ranking.filter(
    ([, count]) => count === highestCount
  );

  const rows = ranking.map(([playerId, count]) => {
    const player = players.find(item => item.id === playerId);
    return `${player.name}: ${count} phiếu`;
  });

  if (leaders.length === 1) {
    const eliminatedPlayer = players.find(
      item => item.id === leaders[0][0]
    );

    eliminatedPlayer.alive = false;

    rows.push(`${eliminatedPlayer.name} đã bị loại.`);
  } else {
    const names = leaders.map(([playerId]) => {
      return players.find(item => item.id === playerId).name;
    });

    rows.push(`Hòa phiếu: ${names.join(", ")}.`);
    rows.push("Không ai bị loại.");
  }

  rows.push(`Chưa bỏ phiếu: ${missingVotes} người.`);

  return rows.join("\n");
}

// Nút ngủ/thức điều khiển chuyển pha ngày và đêm.
export function toggleSleeping() {
  if (state.winner !== null) return;
  if (state.phase === "revealed") startNight();
  else if (state.phase === "night") resolveNight();
}

export function startNight() {
  if (state.phase !== "revealed" || state.winner !== null) return;
  state.seerUsed = false;
  state.seerResult = "";
  state.guardTargetId = null;
  state.phase = "night";
  state.sleeping = true;
  state.selectedPlayerId = null;
  state.choosingTarget = false;
  state.nightTargetId = null;
  state.votingEndsAt = null;
  state.pendingVotes.clear();
  state.votes.clear();
  state.result = "";
  state.message = "Đêm xuống. Sói chọn nạn nhân; Tiên tri soi; Bảo vệ chọn người cần bảo vệ.";
}

export function resolveNight() {
  if (state.phase !== "night" || state.winner !== null) return;
  const target = players.find(player => player.id === state.nightTargetId);
  // Chốt bảo vệ trước khi xử lý nạn nhân: hành động cùng đêm có hiệu lực đồng thời.
  const guard = players.find(player => player.role === "guard" && player.alive);
  const protectedId = guard ? state.guardTargetId : null;
  state.previousGuardTargetId = protectedId;
  state.guardTargetId = null;
  state.seerResult = "";
  state.phase = "day";
  state.sleeping = false;
  state.selectedPlayerId = null;
  state.choosingTarget = false;
  state.nightTargetId = null;

  if (target && target.alive && target.role !== "wolf") {
    if (target.id === protectedId) {
      state.result = "Đêm qua không ai bị loại.";
    } else {
      target.alive = false;
      state.result = target.name + " đã bị Sói tấn công trong đêm.";
    }
  } else {
    state.result = "Đêm qua không ai bị tấn công.";
  }
  state.history.push({ title: "Kết quả · Đêm " + state.day, text: state.result });
  state.day += 1;
  state.message = "Trời sáng. Bấm “Bắt đầu bỏ phiếu” để tiếp tục.";
  checkWinner();
}

export function clearVotes() {
    players.forEach(player => {
        player.alive = true;
    }); 

    state.day = 1;
    state.history = [];
    state.guardTargetId = null;
    state.previousGuardTargetId = null;
    state.seerUsed = false;
    state.seerResult = "";
    state.nightTargetId = null;
    state.votingEndsAt = null;
    state.winner = null;
    assignRoles();
    state.phase = "idle";
    state.sleeping = false;
    state.selectedPlayerId = null;
    state.choosingTarget = false;

    state.pendingVotes.clear();
    state.votes.clear();

    state.result = "";
    state.message = "Đã đặt lại. Có thể bắt đầu vòng mới.";
}

// Chỉ chia vai lúc bắt đầu ván hoặc đặt lại, không chia lại mỗi vòng.
export function assignRoles() {
  const roles = players.map((_, index) => index < 2 ? "wolf" : index === 2 ? "seer" : index === 3 ? "guard" : "villager");

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  players.forEach((player, index) => {
    player.role = roles[index];
  });
}

function checkWinner() {
  const living = players.filter(player => player.alive);
  const wolves = living.filter(player => player.role === "wolf").length;
  const villagers = living.length - wolves;

  if (wolves === 0) {
    state.winner = "villagers";
  } else if (wolves >= villagers) {
    state.winner = "wolves";
  } else {
    state.winner = null;
  }

  if (state.winner === null) return;

  state.phase = "ended";
  state.selectedPlayerId = null;
  state.choosingTarget = false;
  state.message = state.winner === "villagers"
    ? "Dân làng chiến thắng! Không còn Sói sống."
    : "Ma sói chiến thắng! Số Sói đã bằng hoặc vượt số Dân.";
  state.result += "\n\n" + state.message;
}

// Dùng mốc kết thúc để không đếm chậm khi trình duyệt giảm tần suất timer.
export function expireVoting(now = Date.now()) {
  if (
    state.phase !== "voting" ||
    state.votingEndsAt === null ||
    now < state.votingEndsAt
  ) return false;

  revealVotes();
  state.message = "Hết 30 giây. " + state.message;
  return true;
}

export function createSnapshot() {
  return validateSnapshot({
    version: 1,
    players: players.map(({ id, role, alive }) => ({ id, role, alive })),
    state: {
      ...state, history: state.history.slice(-100),
      pendingVotes: [...state.pendingVotes], votes: [...state.votes]
    }
  });
}

export function restoreSnapshot(value) {
  // Kiểm tra xong toàn bộ rồi mới thay đổi ván đang chơi.
  const snapshot = validateSnapshot(value);
  snapshot.players.forEach(saved => {
    Object.assign(players.find(player => player.id === saved.id), saved);
  });
  Object.assign(state, snapshot.state, {
    pendingVotes: new Map(snapshot.state.pendingVotes),
    votes: new Map(snapshot.state.votes)
  });
  expireVoting();
}
