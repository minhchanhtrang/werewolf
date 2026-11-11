let controller;

export function getChatPrivacy() {
  if (controller) return controller;
  const screen = document.querySelector('#screen-game');
  const village = document.querySelector('#villageChat');
  const wolf = document.querySelector('#wolfChat');
  const panels = [village, wolf];
  const mobile = window.matchMedia('(max-width: 650px)');
  let collapsed = false;
  const titles = [village.querySelector('h3 > span'), wolf.querySelector('.wolf-chat__heading > span')];
  const hints = [titles[0]].map(() => {
    const hint = document.createElement('p');
    hint.className = 'chat-channel-hint';
    hint.hidden = true;
    hint.textContent = 'Bấm đúp Chat để đổi sang kênh chat Sói';
    screen.append(hint);
    return hint;
  });
  let available = false, gameId = null, privateChannel = false;
  function sync() {
    screen.dataset.chatChannel = privateChannel ? 'wolf' : 'village';
    screen.classList.toggle('chat-is-collapsed', mobile.matches && collapsed);
    for (const panel of panels) {
      panel.classList.add('is-open');
      const toggle = panel.querySelector('.village-chat__toggle');
      toggle.hidden = !mobile.matches;
      toggle.setAttribute('aria-expanded', String(!mobile.matches || !collapsed));
      toggle.textContent = collapsed ? 'Mở chat' : 'Thu gọn';
    }
    for (const title of titles) title.textContent = 'Chat';
    for (const hint of hints) hint.hidden = !available;
  }
  function reset() { privateChannel = false; sync(); }
  mobile.addEventListener('change', sync);
  for (const panel of panels) {
    panel.querySelector('.village-chat__toggle').addEventListener('click', event => {
      event.stopImmediatePropagation();
      if (!mobile.matches) return;
      collapsed = !collapsed;
      if (collapsed) privateChannel = false;
      sync();
      if (!collapsed) {
        const list = village.querySelector('ol');
        list.scrollTop = list.scrollHeight;
      }
    }, true);
  }
  for (const title of titles) {
    let lastTap = 0, lastTouch = 0;
    function switchChannel() {
      if (!available) return;
      privateChannel = !privateChannel;
      collapsed = false;
      sync();
      const list = privateChannel ? wolf.querySelector('ol') : village.querySelector('ol');
      list.scrollTop = list.scrollHeight;
    }
    title.addEventListener('dblclick', event => {
      event.preventDefault();
      if (Date.now() - lastTouch > 700) switchChannel();
    });
    // Mobile double taps do not consistently produce dblclick.
    title.addEventListener('pointerup', event => {
      if (event.pointerType !== 'touch') return;
      const now = Date.now();
      lastTouch = now;
      if (lastTap && now - lastTap < 350) { switchChannel(); lastTap = 0; }
      else lastTap = now;
    });
  }
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  controller = {
    refresh: sync,
    update(chat) {
      if (gameId !== (chat?.gameId ?? null) || available !== Boolean(chat)) {
        gameId = chat?.gameId ?? null;
        available = Boolean(chat);
        reset();
      } else sync();
    }
  };
  sync();
  return controller;
}
