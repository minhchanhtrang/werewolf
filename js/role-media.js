// Play visible role artwork only; keep the poster when playback is unavailable.
const visible = new Set();
const timers = new Map();
const completed = new WeakSet();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
function canPlay(video) { return visible.has(video) && !document.hidden && !video.hidden; }
function stopSurprise(video) {
  clearTimeout(timers.get(video)); timers.delete(video);
  video.pause(); video.classList.remove("is-playing");
}
function scheduleSurprise(video) {
  if (completed.has(video) || timers.has(video) || video.classList.contains("is-playing") || video.error || reducedMotion.matches) return;
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
  observer.observe(video);
  if (video.dataset.surprise) {
    video.addEventListener("playing", () => {
      if (canPlay(video) && !reducedMotion.matches) video.classList.add("is-playing");
      else stopSurprise(video);
    });
    video.addEventListener("ended", () => {
      completed.add(video);
      stopSurprise(video);
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
