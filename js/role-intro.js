// Dựa vào hạn của server để tải lại trang không mở thêm 5 giây.
export function createRoleIntro(show, hide) {
  let gameId = null;
  let autoOpened = false;
  return (game, now = Date.now(), visible = true) => {
    const cutoff = game?.deadline - 5000;
    if ((game?.id ?? null) !== gameId) {
      if (autoOpened) hide();
      gameId = game?.id ?? null;
      autoOpened = Boolean(game?.phase === "intro" && now < cutoff && visible);
      if (autoOpened) show();
    }
    if (autoOpened && (!visible || game?.phase !== "intro" || now >= cutoff)) {
      hide(); autoOpened = false;
    }
  };
}
