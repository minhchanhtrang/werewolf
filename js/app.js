import { players } from "./data.js";

import {
  state,
  selectPlayer,
  startVoting,
  toggleTargetSelection,
  revealVotes,
  toggleSleeping,
  clearVotes,
  assignRoles,
  expireVoting
} from "./state.js";

import { createScene } from "./scene.js";

const sceneElement = document.querySelector("#scene");

const sleepButton = document.querySelector("#toggleSleep");
const targetButton = document.querySelector("#chooseTarget");
const startButton = document.querySelector("#startVoting");
const revealButton = document.querySelector("#revealVotes");
const clearButton = document.querySelector("#clearVotes");

const messageElement = document.querySelector("#selection");
const progressElement = document.querySelector("#voteProgress");
const resultElement = document.querySelector("#voteResult");
const timerElement = document.querySelector("#voteTimer");
const seerPanel = document.querySelector("#seerPanel");
const seerResultElement = document.querySelector("#seerResult");
const phaseElement = document.querySelector("#phaseLabel");
const aliveElement = document.querySelector("#aliveCount");
const historyElement = document.querySelector("#gameHistory");
const rolesButton = document.querySelector("#toggleRoles");
const autoButton = document.querySelector("#autoVotes");
const nightElement = document.querySelector("#nightActions");
let renderedHistory = "";
let votingTimerId = null;

const scene = createScene(sceneElement, playerId => {
  selectPlayer(playerId);
  render();
});

function render() {
    syncVotingTimer();
    renderTimer();
    scene.render(players, state);

    const voting = state.phase === "voting";
    const ended = state.phase === "ended";
    const night = state.phase === "night";
    const livingPlayers = players.filter(player => player.alive);

    const selectedPlayer = livingPlayers.find(
    player => player.id === state.selectedPlayerId
);

  const phaseNames = { idle: "Chuẩn bị", day: "Thảo luận", voting: "Bỏ phiếu", revealed: "Kết quả bỏ phiếu", night: "Đêm xuống", ended: "Kết thúc" };
  phaseElement.textContent = (night ? "Đêm " : "Ngày ") + state.day + " · " + phaseNames[state.phase];
  aliveElement.textContent = livingPlayers.length + "/" + players.length + " người còn sống";
  sceneElement.classList.toggle("night", night);
  rolesButton.textContent = state.showRoles ? "Ẩn vai" : "Hiện vai (quản trò)";
  rolesButton.setAttribute("aria-pressed", String(state.showRoles));
  autoButton.disabled = !voting;
  nightElement.hidden = !night;
  if (night) {
    const seer = livingPlayers.some(player => player.role === "seer");
    const guard = livingPlayers.some(player => player.role === "guard");
    nightElement.textContent = "Sói: " + (state.nightTargetId === null ? "chưa chọn" : "đã chọn")
      + " · Tiên tri: " + (!seer ? "đã bị loại" : state.seerUsed ? "đã soi" : "chưa soi")
      + " · Bảo vệ: " + (!guard ? "đã bị loại" : state.guardTargetId === null ? "chưa chọn" : "đã chọn");
  }
  const historySignature = JSON.stringify(state.history);
  if (renderedHistory !== historySignature) {
    historyElement.replaceChildren();
    state.history.slice().reverse().forEach(entry => {
      const item = document.createElement("li");
      const title = document.createElement("strong");
      const text = document.createElement("p");
      title.textContent = entry.title;
      text.textContent = entry.text;
      item.append(title, text);
      historyElement.append(item);
    });
    renderedHistory = historySignature;
  }

  sleepButton.disabled = !["revealed", "night"].includes(state.phase) || ended;

  sleepButton.textContent = night ? "Sang sáng" : "Bắt đầu đêm";

  startButton.disabled = !["idle", "day"].includes(state.phase) || ended;

  startButton.textContent = ended
    ? "Ván đã kết thúc"
    : state.phase === "revealed"
    ? "Chờ pha đêm"
    : "Bắt đầu bỏ phiếu";

targetButton.disabled =
  (!voting && !night) ||
  !selectedPlayer ||
  (night && !["wolf", "seer", "guard"].includes(selectedPlayer.role)) ||
  (night && selectedPlayer.role === "seer" && state.seerUsed);

  targetButton.setAttribute(
    "aria-pressed",
    String(state.choosingTarget)
  );

  targetButton.textContent = state.choosingTarget
    ? "Hủy chọn mục tiêu"
    : night && selectedPlayer?.role === "seer"
      ? "Soi một người"
      : night && selectedPlayer?.role === "guard"
        ? "Bảo vệ một người"
        : "Chọn mục tiêu";

  revealButton.disabled = !voting;

  messageElement.textContent = state.message;
  resultElement.textContent = state.result;
  const viewingSeer = night && selectedPlayer?.role === "seer";
  seerPanel.hidden = !viewingSeer;
  seerResultElement.textContent = viewingSeer
    ? state.seerResult || "Chưa soi ai trong đêm nay."
    : "";

  if (voting) {
    progressElement.textContent =
      `Đã ghi nhận ${state.pendingVotes.size}/${livingPlayers.length} phiếu.`;
  } else if (night) {
    progressElement.textContent = state.nightTargetId === null
      ? "Bầy Sói chưa chọn mục tiêu. Sang sáng lúc này sẽ không có nạn nhân."
      : "Bầy Sói đã chọn mục tiêu. Bấm “Sang sáng” để công bố.";
  } else if (state.phase === "day") {
    progressElement.textContent = "Trời sáng. Mọi người chuẩn bị bỏ phiếu.";
  } else if (ended) {
    progressElement.textContent = "Ván đã kết thúc. Bấm “Đặt lại” để chơi lại.";
  } else if (state.phase === "revealed") {
    progressElement.textContent = "Đã công bố kết quả. Bấm “Bắt đầu đêm” để tiếp tục.";
  } else {
    progressElement.textContent = "Chưa bắt đầu.";
  }
}

function renderTimer() {
  const seconds = state.votingEndsAt === null
    ? null
    : Math.max(0, Math.ceil((state.votingEndsAt - Date.now()) / 1000));

  timerElement.textContent = seconds === null
    ? "Thời gian: —"
    : "Thời gian: " + seconds + " giây";
  timerElement.classList.toggle("urgent", seconds !== null && seconds <= 5);
}

function syncVotingTimer() {
  if (state.phase !== "voting") {
    if (votingTimerId !== null) clearInterval(votingTimerId);
    votingTimerId = null;
    return;
  }

  if (votingTimerId !== null) return;

  votingTimerId = setInterval(() => {
    if (expireVoting()) {
      render();
    } else {
      // Chỉ cập nhật chữ số, tránh dựng lại animation mỗi nhịp.
      renderTimer();
    }
  }, 100);
}

function bindAction(button, action) {
  button.addEventListener("click", () => {
    action();
    render();
  });
}

bindAction(sleepButton, toggleSleeping);
bindAction(targetButton, toggleTargetSelection);
bindAction(startButton, startVoting);
bindAction(revealButton, revealVotes);
bindAction(clearButton, clearVotes);
bindAction(rolesButton, () => { state.showRoles = !state.showRoles; });
bindAction(autoButton, () => {
  if (expireVoting() || state.phase !== "voting") return;
  const living = players.filter(player => player.alive);
  living.forEach(actor => {
    if (state.pendingVotes.has(actor.id)) return;
    const targets = living.filter(target => target.id !== actor.id);
    state.selectedPlayerId = actor.id;
    state.choosingTarget = true;
    selectPlayer(targets[Math.floor(Math.random() * targets.length)].id);
  });
  state.selectedPlayerId = null;
  state.choosingTarget = false;
  if (state.phase === "voting") state.message = "Đã tạo phiếu ngẫu nhiên cho những người chưa bỏ phiếu.";
});

window.addEventListener("resize", scene.resize);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && expireVoting()) render();
});

assignRoles();
render();
