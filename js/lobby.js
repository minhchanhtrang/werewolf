// lobby.js — Room management and screen routing for Ma Sói · Đêm bên lửa trại
// Updated: render() now switches between #screen-lobby, #screen-waiting, #screen-game.
// All existing game/room logic is preserved unchanged.

import { authState } from "./auth.js";
import { createOnlineGame } from "./online-game.js";
import { MIN_PLAYERS, MAX_PLAYERS, describeRoles, canStartRoom } from "./rules.js";

// ── DOM References (original IDs — must remain for JS correctness) ────────

const createButton = document.querySelector("#createRoom");
const joinForm     = document.querySelector("#joinRoomForm");
const codeInput    = document.querySelector("#roomCodeInput");
const joinButton   = document.querySelector("#joinRoom");
const readyButton  = document.querySelector("#readyRoom");
const leaveButton  = document.querySelector("#leaveRoom");
const entry        = document.querySelector("#roomEntry");
const waiting      = document.querySelector("#waitingRoom");
const roomStage    = document.querySelector("#roomStage");   // in lobby screen
const playScreen   = document.querySelector("#playScreen");
let lastView = "";
const members      = document.querySelector("#roomMembers");
const message      = document.querySelector("#roomMessage");
const codeElement  = document.querySelector("#roomCode");
const copyStatus   = document.querySelector("#copyRoomStatus");

document.querySelector("#copyRoomCode").addEventListener("click", async () => {
  const code = room?.code;
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code);
    if (room?.code === code) copyStatus.textContent = "Đã sao chép mã " + code + ". Gửi mã này cho bạn bè.";
  } catch {
    if (room?.code === code) copyStatus.textContent = "Không thể sao chép tự động. Bạn có thể chọn mã " + code + " và sao chép thủ công.";
  }
});

const countElement = document.querySelector("#roomCount");
const progress     = document.querySelector("#readyCount");
const fillBots     = document.querySelector("#fillBots");
const removeBots   = document.querySelector("#removeBots");
const startRoom    = document.querySelector("#startRoom");
const resetRoom    = document.querySelector("#resetRoom");
const rolePanel    = document.querySelector("#myRolePanel");
const roleCard     = document.querySelector("#roleCard");
const roleToggle   = document.querySelector("#toggleRole");
const rolePortrait = document.querySelector("#rolePortrait");

function hideRole() {
  roleCard.hidden = true;
  rolePanel.hidden = true;
  roleToggle.textContent = "🃏 Xem vai";
  roleToggle.setAttribute("aria-expanded", "false");
}

function showRole() {
  roleCard.hidden = false;
  rolePanel.hidden = false;
  roleToggle.textContent = "✕ Đóng vai";
  roleToggle.setAttribute("aria-expanded", "true");
}

roleToggle.addEventListener("click", () => {
  if (roleCard.hidden) {
    showRole();
  } else {
    hideRole();
  }
});

document.querySelector("#closeRoleModal")?.addEventListener("click", hideRole);
document.querySelector("#closeRoleBackdrop")?.addEventListener("click", hideRole);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) hideRole();
});

let room = null;
let busy = false;
let generation = 0;
let controller = null;

const renderGame = createOnlineGame((targetId, kind) => {
  if (room?.game) update("act", { phaseId: room.game.phaseId, targetId, ...(kind ? { kind } : {}) });
});


// ── Screen Routing ──────────────────────────────────────────────────────────

const screenLogin   = document.querySelector("#screen-login");
const screenLobby   = document.querySelector("#screen-lobby");
const screenWaiting = document.querySelector("#screen-waiting");
const screenGame    = document.querySelector("#screen-game");

/**
 * Show one app screen and hide the others.
 * @param {"lobby"|"waiting"|"play"|"auth"} view
 */
function showScreen(view) {
  // Login screen is managed by auth.js; we never touch it here.
  const isLobby   = view === "lobby";
  const isWaiting = view === "waiting";
  const isPlay    = view === "play";

  if (screenLobby)   screenLobby.hidden   = !isLobby;
  if (screenWaiting) screenWaiting.hidden = !isWaiting;
  if (screenGame)    screenGame.hidden    = !isPlay;

  // Sync mirror elements on waiting/game screens when their screen is shown.
  if (isWaiting || isPlay) {
    _syncWaitingRoomUI();
  }
}

/**
 * Sync the room-code / count / tools UI that is duplicated on the
 * waiting and game screens to match the canonical values on lobby screen.
 */
function _syncWaitingRoomUI() {
  // Waiting screen elements (IDs with -waiting suffix in HTML)
  const codeWaiting  = document.querySelector("#roomCode-waiting-display");
  const countWaiting = document.querySelector("#roomCount-waiting");
  if (codeWaiting  && codeElement)  codeWaiting.textContent  = codeElement.textContent || "——————";
  if (countWaiting && countElement) countWaiting.textContent = countElement.textContent;

  // Game screen elements (IDs with -game suffix in HTML)
  const codeGame  = document.querySelector("#roomCode-game");
  const countGame = document.querySelector("#roomCount-game");
  if (codeGame  && codeElement)  codeGame.textContent  = codeElement.textContent;
  if (countGame && countElement) countGame.textContent = countElement.textContent;
}

// ── Intro Tabs ──────────────────────────────────────────────────────────────
// Add tab switching behaviour for the lobby intro section.

function initIntroTabs() {
  const tabs     = document.querySelectorAll(".tab-btn");
  const panels   = document.querySelectorAll(".tabpanel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("aria-controls");

      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });

      panels.forEach(p => { p.hidden = true; });

      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");

      const targetPanel = document.querySelector("#" + targetId);
      if (targetPanel) targetPanel.hidden = false;
    });

    // Keyboard navigation between tabs
    tab.addEventListener("keydown", e => {
      const tabArray = Array.from(tabs);
      const idx      = tabArray.indexOf(tab);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        tabArray[(idx + 1) % tabArray.length].focus();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        tabArray[(idx - 1 + tabArray.length) % tabArray.length].focus();
      }
    });
  });
}

initIntroTabs();

// ── Main Render ─────────────────────────────────────────────────────────────

function render() {
  const user = authState.user;
  const view = !user ? "auth" : room?.game ? "play" : room ? "waiting" : "lobby";
  document.body.dataset.view = view;

  // Show the correct screen
  if (user) {
    showScreen(view);
  }

  // ── Original lobby sub-element visibility logic (preserved exactly) ──

  entry.hidden     = view !== "lobby";
  roomStage.hidden = !room;
  waiting.hidden   = view !== "waiting";
  playScreen.hidden= view !== "play";

  document.querySelector("#botTools").hidden = !room || room.host_id !== user?.id;

  const titles = {
    auth: "Sảnh chờ", lobby: "Sảnh chờ", create: "Tạo phòng",
    waiting: "Phòng chờ", play: "Bên lửa trại"
  };

  const lobbyHeading = document.querySelector("#lobbyHeading");
  if (lobbyHeading) lobbyHeading.textContent = titles[view];

  const screenLabel = document.querySelector("#screenLabel");
  if (user && screenLabel) screenLabel.textContent = titles[view].toLocaleUpperCase("vi-VN");

  if (lastView !== view) {
    document.querySelectorAll(".prototype-panel[open]").forEach(node => { node.open = false; });
    if (user && lobbyHeading) lobbyHeading.focus({ preventScroll: true });
    window.dispatchEvent(new Event("resize"));
    lastView = view;
  }

  renderGame(room?.game, user?.id, busy);
  if (!room?.game) {
    hideRole();
    rolePortrait.removeAttribute("src");
  }

  members.hidden = progress.hidden = Boolean(room?.game?.roster);

  for (const button of [fillBots, removeBots, startRoom, resetRoom]) {
    button.hidden   = !room || room.host_id !== user?.id;
    button.disabled = busy;
  }

  createButton.disabled = joinButton.disabled = codeInput.disabled = !user || busy;
  readyButton.disabled  = leaveButton.disabled = !user || busy;

  if (!room) {
    copyStatus.textContent = "";
    members.replaceChildren();
    document.querySelector("#myRole").textContent        = "";
    document.querySelector("#roleDescription").textContent = "";
    return;
  }

  const dealt = Boolean(room.game);
  fillBots.hidden  ||= dealt;
  removeBots.hidden||= dealt;
  startRoom.hidden ||= dealt;
  resetRoom.hidden ||= !dealt;
  resetRoom.textContent = room.game?.phase === "ended" ? "Về phòng chờ" : "Kết thúc ván / Về phòng chờ";
  readyButton.hidden = dealt;

  const resultBtn = document.querySelector("#resetRoom-result");
  const resultHint = document.querySelector("#resultHostHint");
  if (resultBtn) {
    const isHost = room.host_id === user?.id;
    resultBtn.textContent = isHost ? "↩ Về phòng chờ" : "🔄 Cập nhật phòng chờ";
    if (resultHint) resultHint.textContent = "Kết quả chỉ giữ trong RAM 60 giây rồi tự về phòng chờ. Nhật ký không được lưu sau trận." + (isHost ? " Bạn có thể bấm về phòng chờ ngay." : " Chủ phòng có thể đưa cả phòng về sớm hơn.");
  }

  const capacity = room.capacity ?? MAX_PLAYERS;
  const count    = room.members.length;

  document.querySelector("#waitingRules").textContent = count < MIN_PLAYERS
    ? "Cần thêm " + (MIN_PLAYERS - count) + " người để có thể bắt đầu."
    : "Nếu bắt đầu với " + count + " người: " + describeRoles(count);

  fillBots.textContent   = "Thêm 1 bot";
  startRoom.disabled     = busy || !canStartRoom(room.members, capacity);
  fillBots.disabled      = busy || room.members.length >= capacity;
  removeBots.disabled    = busy || !room.members.some(member => member.bot);

  if (room.game) {
    const labels = {
      wolf: "Ma sói", seer: "Tiên tri", guard: "Bảo vệ",
      witch: "Phù thủy", villager: "Dân làng"
    };
    const descriptions = {
      wolf:     "Bạn thuộc phe Sói.",
      seer:     "Bạn thuộc phe Dân, có khả năng soi người vào ban đêm.",
      guard:    "Bạn thuộc phe Dân, có khả năng bảo vệ vào ban đêm.",
      witch:    "Bạn thuộc phe Dân. Có 1 bình cứu và 1 bình độc cho cả ván; mỗi đêm dùng tối đa 1 bình. Được tự cứu. Bình độc không bị Bảo vệ chặn. Chờ lượt Phù thủy sau lượt Sói để hành động.",
      villager: "Bạn thuộc phe Dân, tìm Sói qua thảo luận và bỏ phiếu."
    };
    document.querySelector("#myRole").textContent          = labels[room.game.myRole] || "Chưa có vai";
    document.querySelector("#roleDescription").textContent = descriptions[room.game.myRole] || "";
    const role = room.game.myRole;
    if (Object.hasOwn(labels, role)) {
      const portrait = "/assets/role/role-" + role + ".png";
      if (rolePortrait.getAttribute("src") !== portrait) rolePortrait.src = portrait;
    } else {
      rolePortrait.removeAttribute("src");
    }
  } else {
    document.querySelector("#myRole").textContent          = "";
    document.querySelector("#roleDescription").textContent = "";
  }

  codeElement.textContent  = room.code;
  countElement.textContent = room.members.length + " người";
  progress.textContent     = room.members.filter(m => m.ready).length + "/" + room.members.length + " người sẵn sàng";

  const me = room.members.find(m => m.id === user?.id);
  readyButton.textContent = me?.ready ? "Hủy sẵn sàng" : "Sẵn sàng";
  readyButton.setAttribute("aria-pressed", String(Boolean(me?.ready)));

  members.replaceChildren();
  room.members.forEach((member, index) => {
    const item   = document.createElement("li");
    const name   = document.createElement("strong");
    const status = document.createElement("span");
    name.textContent = (index + 1) + ". " + member.username
      + (member.id === user?.id     ? " · Bạn"        : "")
      + (member.id === room.host_id ? " · Chủ phòng"  : "");
    if (member.bot) name.textContent += " · Bot thử nghiệm";
    const player    = room.game?.roster?.find(p => p.id === member.id);
    status.textContent = player
      ? player.alive ? "Còn sống" : "Đã bị loại"
      : member.ready ? "Sẵn sàng" : "Đang chờ";
    item.classList.toggle("is-ready", member.ready);
    item.append(name, status);
    members.append(item);
  });

  // Keep mirror elements in sync after full render
  _syncWaitingRoomUI();
}

// ── Network ─────────────────────────────────────────────────────────────────

async function request(action, body) {
  const response = await fetch("/api/rooms/" + action, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: controller.signal
  });
  const data = await response.json();
  if (response.status === 401) window.dispatchEvent(new Event("sessionexpired"));
  if (!response.ok) throw Object.assign(
    new Error(data.error || "Không thể kết nối phòng."),
    { status: response.status }
  );
  return data;
}

async function update(action = "current", body) {
  if (!authState.user || busy) return;
  const version = generation;
  busy = true;
  controller = new AbortController();
  if (body !== undefined) render();
  try {
    const data = await request(action, body);
    if (version !== generation) return;
    if (JSON.stringify(room) !== JSON.stringify(data.room)) {
      room = data.room;
      render();
    }
    message.textContent = "";
    return true;
  } catch (error) {
    if (version === generation && error.name !== "AbortError") {
      message.textContent = error.message
        + (!error.status || error.status >= 500 ? " Hệ thống sẽ tự thử kết nối lại." : "");
    }
    return false;
  } finally {
    if (version === generation) { busy = false; render(); }
  }
}

function accountChanged() {
  generation++;
  controller?.abort();
  busy = false;
  room = null;
  message.textContent = authState.user
    ? "Đang tìm phòng hiện tại…"
    : "Đăng nhập để tạo hoặc tham gia phòng.";
  render();
  update();
}

// ── Event Listeners ──────────────────────────────────────────────────────────

window.addEventListener("accountchange", accountChanged);
createButton.addEventListener("click", () => update("create", {}));
joinForm.addEventListener("submit", event => {
  event.preventDefault();
  update("join", { code: codeInput.value.trim().toUpperCase() });
});
readyButton.addEventListener("click", () => {
  const me = room?.members.find(m => m.id === authState.user?.id);
  if (me) update("ready", { ready: !me.ready });
});
leaveButton.addEventListener("click", () => update("leave", {}));
document.querySelector("#leaveRoom-waiting")?.addEventListener("click", () => update("leave", {}));
document.querySelector("#leaveRoom-game")?.addEventListener("click", () => update("leave", {}));

document.querySelector("#resetRoom-waiting")?.addEventListener("click", () => update("reset", {}));
document.querySelector("#resetRoom-game")?.addEventListener("click", () => update("reset", {}));
document.querySelector("#resetRoom-result")?.addEventListener("click", () => {
  if (room?.host_id === authState.user?.id) {
    update("reset", {});
  } else {
    update("current");
  }
});

document.querySelector("#copyRoomCode-waiting")?.addEventListener("click", async () => {
  const code = room?.code;
  if (!code) return;
  const copyStatusWaiting = document.querySelector("#copyRoomStatus-waiting");
  try {
    await navigator.clipboard.writeText(code);
    if (copyStatusWaiting) copyStatusWaiting.textContent = "Đã sao chép mã " + code + ". Gửi mã này cho bạn bè.";
  } catch {
    if (copyStatusWaiting) copyStatusWaiting.textContent = "Không thể sao chép tự động. Hãy sao chép thủ công.";
  }
});
fillBots.addEventListener("click",    () => update("bots", { fill: true }));
removeBots.addEventListener("click",  () => update("bots", { fill: false }));
startRoom.addEventListener("click",   () => update("start", {}));
resetRoom.addEventListener("click",   () => update("reset", {}));

setInterval(() => update(), 2000);
window.addEventListener("pageshow", () => update());

// ── Boot ─────────────────────────────────────────────────────────────────────
accountChanged();
