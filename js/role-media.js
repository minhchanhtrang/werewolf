// Play visible role artwork only; keep the poster when playback is unavailable.
const visible = new Set();
const timers = new Map();
export const ROLE_VIDEOS = {
  wolf: "/assets/role/role-wolf.mp4",
  guard: "/assets/role/role-guard.mp4",
  hunter: "/assets/role/role-hunter.mp4",
  seer: "/assets/role/role-seer.mp4",
  witch: "/assets/role/role-witch.mp4",
  idiot: "/assets/role/role-idiot.mp4",
  villager: "/assets/role/role-villeger.mp4"
};
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const desktopVideo = matchMedia("(min-width: 769px) and (hover: hover) and (pointer: fine)");
function canPlay(video) { return desktopVideo.matches && visible.has(video) && !document.hidden && !video.hidden; }
function stopSurprise(video) {
  clearTimeout(timers.get(video)); timers.delete(video);
  video.pause(); video.classList.remove("is-playing");
}
function scheduleSurprise(video) {
  if (timers.has(video) || video.classList.contains("is-playing") || video.error || reducedMotion.matches) return;
  timers.set(video, setTimeout(() => {
    timers.delete(video);
    if (!canPlay(video) || reducedMotion.matches) return;
    video.currentTime = 0; video.muted = true;
    video.play().catch(() => { stopSurprise(video); });
  }, 6000 + Math.random() * 8000));
}
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) visible.add(entry.target);
    else visible.delete(entry.target);
  }
  sync();
});
function sync() {
  for (const video of document.querySelectorAll(".animated-role")) {
    if (video.dataset.surprise) {
      if (canPlay(video) && !reducedMotion.matches) scheduleSurprise(video);
      else stopSurprise(video);
    } else if (canPlay(video)) {
      video.muted = true;
      video.play().catch(() => {});
    } else video.pause();
  }
}
export function observeRoleVideo(video) {
  function adjustSpeed() {
    // Keep short clips unchanged; play ~10-second artwork in ~5 seconds.
    const speed = Number.isFinite(video.duration) && video.duration >= 9 && video.duration <= 11 ? 2 : 1;
    video.defaultPlaybackRate = speed;
    video.playbackRate = speed;
  }
  video.addEventListener("loadedmetadata", adjustSpeed);
  video.addEventListener("durationchange", adjustSpeed);
  if (video.readyState >= 1) adjustSpeed();
  observer.observe(video);
  if (video.dataset.surprise) {
    video.addEventListener("playing", () => {
      if (canPlay(video) && !reducedMotion.matches) video.classList.add("is-playing");
      else stopSurprise(video);
    });
    video.addEventListener("ended", () => {
      stopSurprise(video);
      if (canPlay(video)) scheduleSurprise(video);
    });
    video.addEventListener("error", () => stopSurprise(video));
  }
  video.addEventListener("error", () => {
    if (video.id === "roleVideo") {
      video.hidden = true;
      document.querySelector("#rolePortrait").hidden = false;
    }
  });
}
for (const video of document.querySelectorAll(".animated-role")) observeRoleVideo(video);
document.addEventListener("visibilitychange", sync);
reducedMotion.addEventListener("change", sync);
desktopVideo.addEventListener("change", sync);
