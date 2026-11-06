const sheets = {
  intro: ["intro", 4, 4], guard: ["guard", 4, 2], night: ["wolf", 4, 2],
  seer: ["seer", 4, 2], witch: ["witch", 4, 2], hunter: ["hunter", 5, 1],
  dawn: ["dawn", 4, 2], voting: ["voting", 4, 2], revealed: ["revealed", 4, 2]
};
export const persistentPhase = phase => ["guard", "night", "seer", "witch", "hunter"].includes(phase);

export function createPhaseArt(element) {
  const popup = document.querySelector("#phaseArtPopup");
  const context = element.getContext("2d");
  let timer, hideTimer, version = 0, frame = 0, layout = null, artwork = null, phase = null;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function stop() { clearTimeout(timer); timer = null; }
  function tick() {
    stop();
    if (!layout || !artwork || popup.hidden || document.hidden) return;
    const [, columns, rows] = layout;
    const width = artwork.naturalWidth / columns, height = artwork.naturalHeight / rows;
    context.clearRect(0, 0, element.width, element.height);
    context.drawImage(artwork, (frame % columns) * width, Math.floor(frame / columns) * height, width, height, 0, 0, element.width, element.height);
    frame = (frame + 1) % (columns * rows);
    if (!reduced.matches) timer = setTimeout(tick, 180);
  }
  document.addEventListener("visibilitychange", tick);
  reduced.addEventListener("change", tick);
  return nextPhase => {
    phase = nextPhase;
    clearTimeout(hideTimer);
    stop(); const request = ++version; frame = 0; layout = sheets[phase]; popup.hidden = true; artwork = null;
    if (!layout) return;
    const [name, columns, rows] = layout;
    const image = new Image();
    image.onload = () => {
      if (request !== version) return;
      artwork = image;
      element.width = Math.round(image.naturalWidth / columns);
      element.height = Math.round(image.naturalHeight / rows);
      context.imageSmoothingEnabled = false;
      element.style.setProperty("--phase-art-ratio", (image.naturalWidth / columns) / (image.naturalHeight / rows));
      popup.hidden = false; tick();
      if (!persistentPhase(phase)) hideTimer = setTimeout(() => {
        if (request !== version) return;
        popup.hidden = true; stop();
      }, 2000);
    };
    image.src = `/assets/effects/phase-${name}.png`;
  };
}
