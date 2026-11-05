import { createScene } from "./scene.js";

const phases = { voting: "Bỏ phiếu", revealed: "Công bố phiếu", night: "Ban đêm", witch: "Lượt Phù thủy", dawn: "Bình minh", ended: "Kết thúc" };

export function createOnlineGame(onAction) {
  const panel = document.querySelector("#onlineGame");
  const target = document.querySelector("#onlineTarget");
  const button = document.querySelector("#onlineSubmit");
  const status = document.querySelector("#onlineActionStatus");
  const history = document.querySelector("#onlineHistory");
  const timer = document.querySelector("#onlineTimer");
  const result = document.querySelector("#gameResult");
  const resultPlayers = document.querySelector("#resultPlayers");
  const guide = document.querySelector("#phaseGuide");
  let resultKey = "";
  const notice = document.querySelector("#phaseNotice");
  const logPanel = document.querySelector("#chatGameLog");
  let noticeKey = "";
  let gameKey = "";
  document.querySelector("#dismissPhaseNotice").addEventListener("click", () => { notice.hidden = true; });
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
  const witchPanel = document.querySelector("#witchControls");
  const healButton = document.querySelector("#witchHeal");
  const poisonButton = document.querySelector("#witchPoison");
  const skipButton = document.querySelector("#witchSkip");
  healButton.addEventListener("click", () => {
    if (!healButton.disabled && current?.witch?.victimId != null) onAction(current.witch.victimId, "heal");
  });
  poisonButton.addEventListener("click", () => {
    if (poisonButton.disabled) return;
    poisonMode = !poisonMode;
    render(current, userId, currentBusy);
  });
  skipButton.addEventListener("click", () => {
    if (!skipButton.disabled) onAction(null, "skip");
  });
  const scene = createScene(document.querySelector("#onlineScene"), targetId => {
    if (current?.phase === "witch" && eligible.some(player => player.id === targetId) && !button.disabled) {
      target.value = String(targetId);
      target.focus({ preventScroll: true });
      return;
    }
    if (eligible.some(player => player.id === targetId) && !button.disabled) onAction(targetId, current?.phase === "witch" ? "poison" : undefined);
  });
  document.querySelector("#onlineActionForm").addEventListener("submit", event => {
    event.preventDefault();
    if (!button.disabled && eligible.some(player => player.id === Number(target.value))) onAction(Number(target.value), current?.phase === "witch" ? "poison" : undefined);
  });
  function updateTimer() {
    const seconds = current?.deadline ? Math.max(0, Math.ceil((current.deadline - Date.now() - offset) / 1000)) : null;
    timer.textContent = seconds === null ? "" : "Còn " + seconds + " giây";
    timer.classList.toggle("urgent", seconds !== null && seconds <= 5);
    if (seconds === 0) {
      button.disabled = true;
      for (const control of [healButton, poisonButton, skipButton]) control.disabled = true;
    }
  }
  setInterval(updateTimer, 250);
  window.addEventListener("resize", scene.resize);

  function render(game, id, busy) {
    currentBusy = busy;
    current = game?.roster ? game : null;
    userId = id;
    panel.hidden = !current;
    if (!current) {
      witchPanel.hidden = true;
      poisonMode = false;
      potionPhase = "";
      notice.hidden = logPanel.hidden = true;
      noticeKey = gameKey = "";
      result.hidden = true;
      resultPlayers.replaceChildren();
      resultKey = "";
      guide.textContent = "";
      sceneKey = optionsKey = "";
      eligible = [];
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
    const identity = game.id || game.startedAt;
    if (gameKey !== identity) {
      logPanel.open = false;
      noticeKey = "";
      gameKey = identity;
    }
    logPanel.hidden = false;
    document.querySelector("#gameLogCount").textContent = "(" + game.history.length + ")";
    const phaseKey = identity + ":" + game.phaseId;
    if (potionPhase !== phaseKey) { poisonMode = false; potionPhase = phaseKey; }
    if (phaseKey !== noticeKey) {
      document.querySelector("#phaseNoticeHeading").textContent = (["night", "witch"].includes(game.phase) ? "Đêm " : "Ngày ") + game.day + " · " + phases[game.phase];
      document.querySelector("#phaseNoticeText").textContent = game.phaseNotice || game.history.at(-1)?.text || "Ván đã bắt đầu. Hãy xem vai và chọn hành động theo lượt.";
      notice.hidden = false;
      noticeKey = phaseKey;
    }
    result.hidden = game.phase !== "ended";
    if (game.phase === "ended") {
      const key = JSON.stringify([game.winner, game.roster]);
      if (key !== resultKey) {
        document.querySelector("#resultHeading").textContent = game.winner === "wolves" ? "Phe Sói chiến thắng" : "Phe Dân chiến thắng";
        document.querySelector("#resultSummary").textContent = game.winner === "wolves"
          ? "Số Sói còn sống đã bằng hoặc vượt số người phe Dân."
          : "Tất cả Ma sói đã bị loại khỏi làng.";
        resultPlayers.replaceChildren();
        const roles = { wolf: "Ma sói", seer: "Tiên tri", guard: "Bảo vệ", witch: "Phù thủy", villager: "Dân làng" };
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
    const nightGuides = {
      wolf: "Chọn một người phe Dân để tấn công. Nếu các Sói chọn khác nhau và hòa, đêm đó không có nạn nhân.",
      seer: "Chọn một người để soi. Bạn chỉ soi một lần mỗi đêm; kết quả chỉ mình bạn thấy.",
      guard: "Chọn một người để bảo vệ. Có thể tự bảo vệ, nhưng không lặp mục tiêu đêm trước.",
      witch: "Chờ lượt Phù thủy sau lượt Sói. Có 1 bình cứu và 1 bình độc cho cả ván, mỗi đêm tối đa 1 bình.",
      villager: "Bạn đang ngủ. Chờ bình minh để tiếp tục thảo luận."
    };
    guide.textContent = game.phase === "ended" ? "Vai của tất cả người chơi đã được công khai."
      : !me?.alive ? "Bạn đang theo dõi ván. Hãy trò chuyện trong kênh người đã bị loại."
      : game.phase === "voting" ? "Thảo luận rồi bấm một nhân vật hoặc chọn trong danh sách để bỏ phiếu kín. Có thể đổi phiếu trước khi hết giờ."
      : game.phase === "night" ? nightGuides[game.myRole] || "Chờ bình minh."
      : game.phase === "witch" ? "Phù thủy có 20 giây để dùng bình cứu, bình độc hoặc bỏ lượt. Những người khác chờ bình minh."
      : game.phase === "revealed" ? "Phiếu đã được công bố. Hòa phiếu thì không loại ai; đêm sẽ tự bắt đầu."
      : "Đọc kết quả đêm trong diễn biến. Lượt bỏ phiếu tiếp theo sẽ tự bắt đầu.";
    document.querySelector("#onlinePhase").textContent = (["night", "witch"].includes(game.phase) ? "Đêm " : "Ngày ") + game.day + " · " + phases[game.phase];
    document.querySelector("#onlineLiving").textContent = game.roster.filter(player => player.alive).length + "/" + game.roster.length + " còn sống";
    document.querySelector("#onlineSeer").textContent = game.seerResult ? "Kết quả soi riêng · Đêm " + game.seerResult.day + ": " + game.seerResult.text : "";
    document.querySelector("#onlineTeam").textContent = game.myRole === "wolf"
      ? "Phe Sói: " + game.roster.filter(player => game.wolfIds.includes(player.id)).map(player => player.name).join(", ") : "";
    eligible = [];
    let text;
    let label = "Gửi lựa chọn";
    if (game.phase === "ended") {
      text = game.winner === "wolves" ? "Phe Sói chiến thắng. Các vai đã được công bố." : "Phe Dân chiến thắng. Các vai đã được công bố.";
    } else if (!me?.alive) text = "Bạn đã bị loại. Bạn có thể theo dõi đến hết ván.";
    else if (game.phase === "voting") {
      eligible = game.roster.filter(player => player.alive && player.id !== id);
      label = game.myVote === null ? "Bỏ phiếu" : "Đổi phiếu";
      text = "Đã ghi nhận " + game.voteCount + " phiếu. " + (game.myVote === null ? "Chọn một người hoặc chờ hết giờ để bỏ lượt." : "Phiếu của bạn: " + game.roster.find(player => player.id === game.myVote)?.name + ". Chưa công khai với người khác.");
    } else if (game.phase === "witch" && game.myRole === "witch") {
      text = game.witch?.choice ? "Đã chốt lựa chọn. Chờ bình minh." : "Dùng tối đa một bình hoặc bỏ lượt. Không bấm gì thì giữ nguyên các bình.";
      if (poisonMode && game.witch?.poison && !game.witch.choice) {
        eligible = game.roster.filter(player => player.alive && player.id !== id);
        label = "Dùng bình độc";
        text = "Chọn mục tiêu rồi xác nhận dùng bình độc. Lựa chọn sẽ không thể đổi.";
      }
    } else if (game.phase === "witch") text = "Đang chờ Phù thủy. Hãy chờ bình minh.";
    else if (game.phase === "night" && ["wolf", "seer", "guard"].includes(game.myRole)) {
      eligible = game.roster.filter(player => player.alive && (game.myRole === "wolf" ? !game.wolfIds.includes(player.id) : game.myRole === "seer" ? player.id !== id : player.id !== game.previousGuardTargetId));
      label = { wolf: "Chọn nạn nhân", seer: "Soi người", guard: "Bảo vệ" }[game.myRole];
      text = game.myAction === null ? "Chọn mục tiêu, hoặc chờ hết giờ để bỏ lượt." : "Đã ghi nhận lựa chọn của bạn.";
      if (game.myRole === "seer" && game.myAction !== null) {
        eligible = [];
        text = "Bạn đã dùng lượt soi đêm nay.";
      }
      if (game.myRole === "guard") text += " Được tự bảo vệ, không lặp người của đêm trước.";
    } else if (game.phase === "night") text = game.myRole === "witch" ? "Chờ lượt Phù thủy sau khi Sói chốt mục tiêu." : "Dân làng đang ngủ. Hãy chờ trời sáng.";
    else text = "Kết quả đã công bố. Server sẽ tự chuyển pha khi hết giờ.";
    status.textContent = text;
    witchPanel.hidden = !(game.phase === "witch" && game.myRole === "witch" && me?.alive);
    const victim = game.roster.find(player => player.id === game.witch?.victimId && player.alive);
    document.querySelector("#witchStatus").textContent = witchPanel.hidden ? "" :
      "Bình cứu: " + (game.witch?.heal ? "1" : "0") + " · Bình độc: " + (game.witch?.poison ? "1" : "0") + ". "
      + (victim ? victim.name + " đang bị Sói tấn công." : "Không có người cần cứu.");
    const potionsLocked = busy || witchPanel.hidden || Boolean(game.witch?.choice);
    healButton.disabled = potionsLocked || !game.witch?.heal || !victim;
    poisonButton.disabled = potionsLocked || !game.witch?.poison;
    skipButton.disabled = potionsLocked;
    poisonButton.textContent = poisonMode ? "Hủy chọn bình độc" : "Chọn bình độc";
    button.textContent = label;
    button.disabled = busy || eligible.length === 0;
    target.disabled = busy || eligible.length === 0;
    document.querySelector("#onlineActionForm").hidden = eligible.length === 0;
    const key = JSON.stringify([game.phaseId, eligible.map(player => [player.id, player.name])]);
    if (key !== optionsKey) {
      const previous = target.value;
      target.replaceChildren();
      eligible.forEach(player => {
        const option = document.createElement("option"); option.value = player.id; option.textContent = player.name;
        target.append(option);
      });
      if (eligible.some(player => String(player.id) === previous)) target.value = previous;
      optionsKey = key;
    }
    const presentation = JSON.stringify([game.roster, game.phase, game.revealedVotes, game.myVote, game.myAction]);
    if (presentation !== sceneKey) {
      const roster = game.roster.map((player, index) => {
        const angle = index / game.roster.length * Math.PI * 2 - Math.PI / 2;
        return { ...player, role: game.phase === "ended" ? player.role : player.id === id ? game.myRole : "unknown", x: 50 + Math.cos(angle) * 25, y: 61 + Math.sin(angle) * 18 };
      });
      scene.render(roster, {
        phase: game.phase, sleeping: ["night", "witch"].includes(game.phase), showRoles: false,
        selectedPlayerId: userId, votes: new Map(game.revealedVotes)
      });
      document.querySelector("#onlineScene").classList.toggle("night", ["night", "witch"].includes(game.phase));
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
