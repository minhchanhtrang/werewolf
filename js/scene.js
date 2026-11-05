const SPRITES = [
  "/assets/characters/villeger-01-game.png",
  "/assets/characters/villeger-02-game.png",
  "/assets/characters/villeger-03-game.png",
  "/assets/characters/villeger-04-game.png",
  "/assets/characters/villeger-05-game.png",
  "/assets/characters/villeger-06-game.png",
  "/assets/characters/villeger-07-game.png",
  "/assets/characters/villeger-08-game.png",
  "/assets/characters/villeger-09-game.png",
  "/assets/characters/villeger-10-game.png"
];

function getCharacterSprite(id) {
  const num = typeof id === "number" ? id : Math.abs(String(id).split("").reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const index = Math.abs(num) % SPRITES.length;
  return SPRITES[index];
}

export function createScene(sceneElement, onPlayerClick) {
  sceneElement.classList.add("pixel-scene");
  const flame = sceneElement.querySelector(".flame");
  if (flame) flame.textContent = "";
  const buttons = new Map();
  let currentPlayers = [];
  let currentState = null;

  function render(players, state) {
    currentPlayers = players;
    currentState = state;
    sceneElement.classList.toggle("night", state.sleeping);
    sceneElement.classList.toggle("sleeping", state.sleeping);
    sceneElement.style.setProperty("--seat-scale", players.length > 12 ? ".75" : "1");
    const ids = new Set(players.map(player => player.id));
    for (const [id, button] of buttons) {
      if (!ids.has(id)) { button.remove(); buttons.delete(id); }
    }
    const selectedTarget = state.sleeping ? null : state.votes.get(state.selectedPlayerId);
    for (const [seat, player] of players.entries()) {
      let button = buttons.get(player.id);
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "player";
        const avatar = document.createElement("span");
        avatar.className = "avatar";
        avatar.setAttribute("aria-hidden", "true");
        const name = document.createElement("span");
        name.className = "name";
        const status = document.createElement("span");
        status.className = "status";
        button.append(avatar, name, status);
        button.addEventListener("click", () => onPlayerClick(player.id));
        buttons.set(player.id, button);
        sceneElement.append(button);
      }
      const selected = player.id === state.selectedPlayerId;
      const asleep = state.sleeping && ({ night: "wolf", guard: "guard", seer: "seer", witch: "witch" }[state.phase] !== player.role);
      button.classList.toggle("selected", selected);
      button.classList.toggle("target", player.id === selectedTarget);
      button.classList.toggle("eliminated", !player.alive);
      button.classList.toggle("asleep", asleep && player.alive);
      button.disabled = !player.alive || state.phase === "ended";
      button.setAttribute("aria-disabled", String(button.disabled));
      button.setAttribute("aria-pressed", String(selected));
      button.style.left = player.x + "%";
      button.style.top = player.y + "%";
      button.style.zIndex = Math.round(player.y);
      button.style.setProperty("--scale", 0.8 + player.y / 250);
      button.style.setProperty("--delay", -player.id * 0.2 + "s");
      const character = Number.isInteger(player.character) && player.character >= 0 && player.character < SPRITES.length ? player.character : seat;
      button.style.setProperty("--char-sprite", `url("${getCharacterSprite(character)}")`);
      const labels = { wolf: "Sói", seer: "Tiên tri", guard: "Bảo vệ", witch: "Phù thủy", villager: "Dân", hunter: "Thợ săn", idiot: "Thằng ngu" };
      button.querySelector(".name").textContent = state.showRoles || state.phase === "ended"
        ? player.name + " · " + (labels[player.role] || "Chưa rõ") : player.name;
      button.title = player.name;
      button.querySelector(".status").textContent = "";
    }
  }
  function resize() {
    if (currentState) render(currentPlayers, currentState);
  }
  return { render, resize };
}
