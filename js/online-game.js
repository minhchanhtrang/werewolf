import { createScene } from "./scene.js";
import { ROLE_LABELS } from "./rules.js";
import { createPhaseArt } from "./phase-art.js";

const phases = { voting: "Làng họp bàn", revealed: "Mở phiếu", guard: "Bảo vệ đang che chở", night: "Sói đang đi săn", seer: "Tiên tri đang soi", witch: "Phù thủy đang pha thuốc", hunter: "Phát súng cuối cùng", dawn: "Bình minh ló rạng", ended: "Kết thúc" };
const isNight = phase => ["guard", "night", "seer", "witch"].includes(phase);
phases.intro = "Nhận vai";

export function createOnlineGame(onAction, onPhaseExpired = () => {}) {
  const panel = document.querySelector("#onlineGame");
  const target = document.querySelector("#onlineTarget");
  const button = document.querySelector("#onlineSubmit");
  const status = document.querySelector("#onlineActionStatus");
  const history = document.querySelector("#onlineHistory");
  const timer = document.querySelector("#onlineTimer");
  const timeProgress = document.querySelector("#timeProgress");
  const result = document.querySelector("#gameResult");
  const resultPlayers = document.querySelector("#resultPlayers");
  const guide = document.querySelector("#phaseGuide");
  const voteSummary = document.querySelector('#voteSummary');
  const voteSummaryList = document.querySelector('#voteSummaryList');
  let voteSummaryKey = '';
  function renderVoteSummary(game) {
    voteSummary.hidden = game?.phase !== 'voting';
    const rows = game?.phase === 'voting'
      ? game.roster.filter(player => player.alive).map(player => ({
        id: player.id, name: player.name, count: game.voteTally?.[player.id] || 0
      })).sort((a, b) => b.count - a.count)
      : [];
    const key = JSON.stringify(rows);
    if (key === voteSummaryKey) return;
    voteSummaryKey = key;
    voteSummaryList.replaceChildren();
    for (const row of rows) {
      const item = document.createElement('li');
      const name = document.createElement('span'), count = document.createElement('strong');
      name.textContent = row.name;
      count.textContent = row.count + ' phiếu';
      item.classList.toggle('has-votes', row.count > 0);
      item.append(name, count);
      voteSummaryList.append(item);
    }
  }
  let resultKey = "";
  const notice = document.querySelector("#phaseNotice");
  const renderPhaseArt = createPhaseArt(document.querySelector("#phaseArt"));
  const logPanel = document.querySelector("#chatGameLog");
  let noticeKey = "";
  let gameKey = "";
  document.querySelector("#dismissPhaseNotice").addEventListener("click", () => {
    notice.hidden = true;
  });
  let current = null;
  let userId = null;
  let eligible = [];
  let offset = 0;
  let lastServerNow = null;
  let sceneKey = "";
  let optionsKey = "";
  let poisonMode = false;
  let potionPhase = "";
  let currentBusy = false;
  let draftTargetId = null;
  let draftPhase = "";
  let expiredPhase = "";
  const witchPanel = document.querySelector("#witchControls");
  const healButton = document.querySelector("#witchHeal");
  const poisonButton = document.querySelector("#witchPoison");
  const skipButton = document.querySelector("#witchSkip");
  const blankButton = document.querySelector("#blankVote");
  const hunterSkip = document.querySelector("#hunterSkip");
  blankButton.addEventListener("click", () => { if (!blankButton.disabled) { draftTargetId = null; sceneKey = ""; onAction(null, "blank"); } });
  hunterSkip.addEventListener("click", () => { if (!hunterSkip.disabled) onAction(null, "skip"); });
  healButton.addEventListener("click", () => {
    if (!healButton.disabled && current?.witch?.canHeal) onAction(null, "heal");
  });
  poisonButton.addEventListener("click", () => {
    if (poisonButton.disabled) return;
    poisonMode = !poisonMode;
    draftTargetId = null;
    render(current, userId, currentBusy);
  });
  skipButton.addEventListener("click", () => {
    if (!skipButton.disabled) onAction(null, "skip");
  });
  const scene = createScene(document.querySelector("#onlineScene"), targetId => {
    if (!currentBusy && eligible.some(player => player.id === targetId) && current?.deadline > Date.now() + offset) {
      draftTargetId = targetId;
      sceneKey = "";
      render(current, userId, currentBusy);
    }
  });
  target.addEventListener("change", () => {
    draftTargetId = target.value ? Number(target.value) : null;
    sceneKey = "";
    render(current, userId, currentBusy);
  });
  document.querySelector("#onlineActionForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!button.disabled && eligible.some(player => player.id === Number(target.value))) onAction(Number(target.value), current?.phase === "witch" ? "poison" : undefined);
  });
  function updateTimer() {
    const replay = current?.replayVote;
    const replaySeconds = replay?.status === "open" ? Math.max(0, Math.ceil((replay.deadline - Date.now() - offset) / 1000)) : null;
    document.querySelector("#replayCountdown").textContent = replaySeconds === null ? "" : "Còn " + replaySeconds + " giây để biểu quyết.";
    if (replaySeconds === 0) for (const selector of ["#replayYes", "#replayNo"]) document.querySelector(selector).disabled = true;
    const seconds = current?.deadline ? Math.max(0, Math.ceil((current.deadline - Date.now() - offset) / 1000)) : null;
    timer.textContent = seconds === null ? "" : "Còn " + seconds + " giây";
    timer.classList.toggle("urgent", seconds !== null && seconds <= 5);
    timeProgress.hidden = seconds === null;
    const duration = current?.phaseDuration;
    timeProgress.value = seconds === null || !duration ? 0 : Math.min(1, Math.max(0, (current.deadline - Date.now() - offset) / duration));
    timeProgress.classList.toggle("urgent", seconds !== null && seconds <= 5);
    timeProgress.setAttribute("aria-valuetext", seconds === null ? "" : "Còn " + seconds + " giây");
    if (seconds === 0) {
      button.disabled = true;
      for (const control of [healButton, poisonButton, skipButton]) control.disabled = true;
      blankButton.disabled = hunterSkip.disabled = true;
      timer.textContent = "Đang chuyển lượt…";
      const key = current.id + ":" + current.phaseId;
      if (expiredPhase !== key && !currentBusy) {
        expiredPhase = key;
        queueMicrotask(onPhaseExpired);
      }
    }
  }
  setInterval(updateTimer, 250);
  window.addEventListener("resize", scene.resize);
  const footer = document.querySelector(".game-hud-bottom");
  const villageChat = document.querySelector("#villageChat");
  const layoutObserver = new ResizeObserver(() => {
    const screen = document.querySelector("#screen-game");
    screen.style.setProperty("--game-header-height", document.querySelector(".game-hud-top").getBoundingClientRect().height + "px");
    screen.style.setProperty("--game-footer-height", footer.getBoundingClientRect().height + "px");
    screen.style.setProperty("--village-chat-height", villageChat.getBoundingClientRect().height + "px");
    screen.style.setProperty("--wolf-chat-height", document.querySelector("#wolfChat").getBoundingClientRect().height + "px");
  });
  layoutObserver.observe(footer); layoutObserver.observe(villageChat);
  layoutObserver.observe(document.querySelector("#wolfChat"));
  layoutObserver.observe(document.querySelector(".game-hud-top"));

  function render(game, id, busy) {
    currentBusy = busy;
    current = game?.roster ? game : null;
    renderVoteSummary(current);
    userId = id;
    panel.hidden = !current;
    if (!current) {
      document.querySelector("#myDeathReason").hidden = true;
      document.querySelector("#myDeathReason").textContent = "";
      witchPanel.hidden = true;
      poisonMode = false;
      potionPhase = "";
      notice.hidden = logPanel.hidden = true;
      renderPhaseArt(null);
      noticeKey = gameKey = "";
      result.hidden = true;
      resultPlayers.replaceChildren();
      resultKey = "";
      guide.textContent = "";
      sceneKey = optionsKey = "";
      eligible = [];
      draftTargetId = null; draftPhase = "";
      target.replaceChildren(); history.replaceChildren();
      document.querySelector("#onlineSeer").textContent = "";
      document.querySelector("#onlineTeam").textContent = "";
      document.querySelector("#onlineScene").querySelectorAll(".name").forEach(node => { node.textContent = ""; });
      return;
    }
    if (game.serverNow !== lastServerNow) {
      offset = game.serverNow - Date.now();
      lastServerNow = game.serverNow;
    }
    const me = game.roster.find(player => player.id === id);
    const deathNotice = document.querySelector("#myDeathReason");
    deathNotice.hidden = !game.myDeathReason;
    deathNotice.textContent = game.myDeathReason || "";
    const identity = game.id || game.startedAt;
    if (gameKey !== identity) {
      logPanel.open = false;
      noticeKey = "";
      gameKey = identity;
    }
    logPanel.hidden = false;
    document.querySelector("#gameLogCount").textContent = "(" + game.history.length + ")";
    const phaseKey = identity + ":" + game.phaseId;
    if (draftPhase !== phaseKey) {
      draftTargetId = game.myVote ?? game.myAction ?? null;
      draftPhase = phaseKey;
    }
    if (potionPhase !== phaseKey) { poisonMode = false; potionPhase = phaseKey; }
    if (game.phase !== "witch" || game.myRole !== "witch" || !me?.alive || !game.witch?.poison || game.witch?.choice?.poisonId != null || game.witch?.choice?.done) poisonMode = false;
    if (phaseKey !== noticeKey) {
      document.querySelector("#phaseNoticeHeading").textContent = game.phase === "intro" ? "Nhận vai" : (isNight(game.phase) ? "Đêm " : "Ngày ") + game.day + " · " + phases[game.phase];
      document.querySelector("#phaseNoticeText").textContent = game.phaseNotice || game.history.at(-1)?.text || "Ván đã bắt đầu. Hãy xem vai và chọn hành động theo lượt.";
      notice.hidden = game.phase === "ended";
      document.querySelector("#dismissPhaseNotice").hidden = false;
      renderPhaseArt(game.phase);
      noticeKey = phaseKey;
    }
    result.hidden = game.phase !== "ended";
    if (game.phase === "ended") {
      const key = JSON.stringify([game.winner, game.roster]);
      if (key !== resultKey) {
        document.querySelector("#resultHeading").textContent = game.winner === "idiot" ? "Thằng ngu chiến thắng" : game.winner === "wolves" ? "Phe Sói chiến thắng" : "Phe Dân chiến thắng";
        document.querySelector("#resultSummary").textContent = game.winner === "idiot" ? "Cả làng đã bỏ phiếu loại Thằng ngu. Phe thứ ba giành chiến thắng riêng!" : game.winner === "wolves"
          ? "Số Sói còn sống đã bằng hoặc vượt số người phe Dân."
          : "Tất cả Ma sói đã bị loại khỏi làng.";
        resultPlayers.replaceChildren();
        const roles = ROLE_LABELS;
        game.roster.forEach(player => {
          const item = document.createElement("li");
          const name = document.createElement("strong");
          const detail = document.createElement("span");
          name.textContent = player.name + (player.id === id ? " · Bạn" : "");
          detail.textContent = (roles[player.role] || "Chưa rõ") + " · " + (player.alive ? "Còn sống" : "Đã bị loại");
          item.classList.toggle("result-wolf", player.role === "wolf");
          item.append(name, detail);
          resultPlayers.append(item);
        });
        resultKey = key;
      }
    } else {
      resultPlayers.replaceChildren();
      resultKey = "";
    }
    guide.textContent = game.phase === "intro" ? "Ghi nhớ vai của bạn. Đêm 1 bắt đầu khi hết 10 giây chuẩn bị."
      : game.phase === "ended" ? "Vai của tất cả người chơi đã được công khai."
      : game.hunterTurn ? "Chọn một nhân vật để bắn hoặc bỏ phát bắn."
      : !me?.alive ? "Bạn đang theo dõi ván."
      : game.phase === "voting" ? "Nhấp nhân vật để chọn mục tiêu, rồi bấm Bỏ phiếu để xác nhận. Có thể đổi phiếu trước khi hết giờ."
      : ["night", "guard", "seer"].includes(game.phase) ? "Chỉ người có vai được gọi mới hành động. Mỗi lượt vẫn chạy đủ giờ dù vai đó đã chết."
      : game.phase === "witch" ? "Phù thủy có 30 giây, được dùng cả hai bình trong đêm. Những người khác chờ bình minh."
      : game.phase === "revealed" ? "Phiếu đã được công bố. Hòa phiếu thì không loại ai; đêm sẽ tự bắt đầu."
      : "Đọc kết quả đêm trong diễn biến. Lượt bỏ phiếu tiếp theo sẽ tự bắt đầu.";
    document.querySelector("#onlinePhase").textContent = game.phase === "intro" ? "Chuẩn bị · Nhận vai" : (isNight(game.phase) ? "Đêm " : "Ngày ") + game.day + " · " + phases[game.phase];
    document.querySelector("#onlineLiving").textContent = game.roster.filter(player => player.alive).length + "/" + game.roster.length + " còn sống";
    document.querySelector("#onlineSeer").textContent = game.seerResult ? "Kết quả soi.Đêm " + game.seerResult.day + ": " + game.seerResult.text : "";
    document.querySelector("#onlineTeam").textContent = game.myRole === "wolf"
      ? "Phe Sói: " + game.roster.filter(player => game.wolfIds.includes(player.id)).map(player => player.name).join(", ") : "";
    eligible = [];
    let text;
    let label = "Gửi lựa chọn";
    if (game.phase === "intro") {
      text = "Đêm định mệnh sắp bắt đầu…";
    } else if (game.phase === "ended") {
      text = (game.winner === "idiot" ? "Thằng ngu chiến thắng riêng." : game.winner === "wolves" ? "Phe Sói chiến thắng." : "Phe Dân chiến thắng.") + " Các vai đã được công bố.";
    } else if (game.hunterTurn) {
      eligible = game.roster.filter(player => player.alive);
      label = "Bắn mục tiêu"; text = "Nhấp một người để chọn, rồi xác nhận phát bắn; hoặc bỏ lượt.";
    } else if (!me?.alive) text = "Bạn đã bị loại. Bạn có thể theo dõi đến hết ván.";
    else if (game.phase === "voting") {
      eligible = game.canVote ? game.roster.filter(player => player.alive && player.id !== id) : [];
      label = game.myVote === null ? "Bỏ phiếu" : "Đổi phiếu";
      text = !game.canVote ? "Bạn đang theo dõi lượt bỏ phiếu." : "Đã ghi nhận " + game.voteCount + " phiếu." + (game.hasVoted ? "\n" + (game.myVote === null ? "Bạn đã bỏ phiếu trắng." : "Bạn chọn: " + game.roster.find(player => player.id === game.myVote)?.name) : "");
    } else if (game.phase === "witch" && game.myRole === "witch") {
      text = game.witch?.choice?.done ? "Đã bỏ lượt còn lại. Chờ bình minh." : "Có thể dùng cả hai bình trong đêm. Bình không dùng sẽ được giữ lại.";
      if (poisonMode && game.witch?.poison && !game.witch.choice?.poisonId && !game.witch.choice?.done) {
        eligible = game.roster.filter(player => player.alive && player.id !== id);
        label = "Dùng bình độc";
        text = "Chọn mục tiêu rồi xác nhận dùng bình độc. Lựa chọn sẽ không thể đổi.";
      }
    } else if (game.phase === "witch") text = "Đang chờ Phù thủy. Hãy chờ bình minh.";
    else if (({ guard: "guard", night: "wolf", seer: "seer" }[game.phase]) === game.myRole) {
      eligible = game.roster.filter(player => player.alive && (game.myRole === "wolf" ? player.id === id || !game.wolfIds.includes(player.id) : game.myRole === "seer" ? player.id !== id : player.id !== game.previousGuardTargetId));
      label = { wolf: "Chọn nạn nhân", seer: "Soi người", guard: "Bảo vệ" }[game.myRole];
      text = game.myAction === null ? "Chọn mục tiêu, hoặc chờ hết giờ để bỏ lượt." : "Đã ghi nhận lựa chọn của bạn.";
      if (game.myRole === "seer" && game.myAction !== null) {
        eligible = [];
        text = "Bạn đã dùng lượt soi đêm nay.";
      }
      if (game.myRole === "guard") text += " Được tự bảo vệ, không lặp người của đêm trước.";
      if (game.myRole === "wolf") text += " Có thể chọn chính mình làm nạn nhân; kết quả vẫn theo lựa chọn chung của bầy Sói.";
    } else if (game.phase === "night") text = game.myRole === "witch" ? "Chờ lượt Phù thủy sau khi Sói chốt mục tiêu." : "Dân làng đang ngủ. Hãy chờ trời sáng.";
    else text = "Kết quả đã công bố. Server sẽ tự chuyển pha khi hết giờ.";
    status.textContent = text;
    witchPanel.hidden = !(game.phase === "witch" && game.myRole === "witch" && me?.alive);
    document.querySelector("#witchStatus").textContent = witchPanel.hidden ? "" :
      "Bình cứu: " + (game.witch?.heal ? "1" : "0") + " · Bình độc: " + (game.witch?.poison ? "1" : "0") + ".\n"
      + (game.witch?.choice?.heal ? "Đã dùng bình cứu. " : game.witch?.canHeal ? "Đêm nay có người bị Sói tấn công. Bạn có muốn cứu không? " : "Không có mục tiêu có thể cứu. ")
      + (game.witch?.choice?.poisonId ? "Đã dùng bình độc." : "");
    const potionsLocked = busy || witchPanel.hidden || Boolean(game.witch?.choice?.done);
    healButton.disabled = potionsLocked || !game.witch?.canHeal;
    poisonButton.disabled = potionsLocked || !game.witch?.poison || game.witch?.choice?.poisonId != null;
    skipButton.disabled = potionsLocked;
    document.querySelector("#witchPoisonLabel").textContent = poisonMode ? "Hủy chọn bình độc" : "Chọn bình độc";
    button.textContent = label;
    if (!eligible.some(player => player.id === draftTargetId)) draftTargetId = null;
    button.disabled = busy || draftTargetId === null;
    target.disabled = busy || eligible.length === 0;
    blankButton.hidden = game.phase !== "voting" || !game.canVote;
    blankButton.disabled = busy;
    hunterSkip.hidden = !game.hunterTurn; hunterSkip.disabled = busy;
    const choices = document.querySelector("#wolfChoices");
    choices.hidden = !game.wolfChoices?.length;
    const choiceList = document.querySelector("#wolfChoicesList"); choiceList.replaceChildren();
    for (const wolf of game.wolfChoices || []) {
      const item = document.createElement("li"); item.textContent = wolf.name + " → " + (wolf.targetName || "Chưa chọn"); choiceList.append(item);
    }
    document.querySelector("#onlineActionForm").hidden = eligible.length === 0;
    const key = JSON.stringify([game.phaseId, eligible.map(player => [player.id, player.name])]);
    if (key !== optionsKey) {
      target.replaceChildren();
      const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Nhấp nhân vật để chọn"; target.append(placeholder);
      eligible.forEach(player => {
        const option = document.createElement("option"); option.value = player.id; option.textContent = player.name;
        target.append(option);
      });
      optionsKey = key;
    }
    target.value = draftTargetId === null ? "" : String(draftTargetId);
    document.querySelector("#targetSelection").textContent = draftTargetId === null ? "" : "Đang chọn: " + game.roster.find(player => player.id === draftTargetId)?.name;
    const presentation = JSON.stringify([game.roster, game.phase, game.revealedVotes, game.myVote, game.myAction, draftTargetId]);
    if (presentation !== sceneKey) {
      const roster = game.roster.map((player, index) => {
        const angle = index / game.roster.length * Math.PI * 2 - Math.PI / 2;
        return { ...player, role: game.phase === "ended" ? player.role : player.id === id ? game.myRole : "unknown", x: 50 + Math.cos(angle) * 25, y: 61 + Math.sin(angle) * 18 };
      });
      scene.render(roster, {
        phase: game.phase, sleeping: isNight(game.phase), showRoles: false,
        selectedPlayerId: userId, targetId: draftTargetId, votes: new Map(game.revealedVotes)
      });
      document.querySelector("#onlineScene").classList.toggle("night", isNight(game.phase));
      sceneKey = presentation;
    }
    history.replaceChildren();
    game.history.slice().reverse().forEach(entry => {
      const item = document.createElement("li"); const title = document.createElement("strong"); const body = document.createElement("p");
      title.textContent = entry.title; body.textContent = entry.text; item.append(title, body); history.append(item);
    });
    updateTimer();
  }
  return render;
}
