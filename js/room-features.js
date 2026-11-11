import { ROLE_LABELS, validateRoles } from './rules.js';
import { installRoomExit } from './room-exit.js';

export function createRoomFeatures(send) {
  const waiting = document.querySelector('#screen-waiting');
  const chat = document.createElement('section');
  chat.className = 'waiting-chat card';
  chat.innerHTML = `<h3>Chat phòng chờ</h3>
    <ol class="waiting-chat__messages" role="log" aria-live="polite" aria-label="Tin nhắn phòng chờ"></ol>
    <form><label class="wolf-chat__label" for="waitingChatInput">Tin nhắn phòng chờ</label>
    <input id="waitingChatInput" maxlength="300" required autocomplete="off" placeholder="Nhắn với mọi người…">
    <button class="btn btn--primary btn--sm" type="submit">Gửi</button></form>
    <p class="waiting-chat__status" role="status"></p>`;
  waiting.querySelector('.waiting-sidebar').append(chat);
  const list = chat.querySelector('ol'), input = chat.querySelector('input');
  const submit = chat.querySelector('form button'), status = chat.querySelector('[role="status"]');
  const toggle = document.createElement('button');
  toggle.type = 'button'; toggle.className = 'waiting-chat__toggle btn btn--ghost btn--sm';
  list.id = 'waitingChatMessages';
  chat.querySelector('form').id = 'waitingChatForm';
  toggle.setAttribute('aria-controls', 'waitingChatMessages waitingChatForm');
  function setCollapsed(collapsed) {
    chat.classList.toggle('is-mobile-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? 'Mở chat' : 'Thu gọn';
    if (!collapsed) list.scrollTop = list.scrollHeight;
  }
  setCollapsed(false);
  chat.querySelector('h3').append(toggle);
  toggle.addEventListener('click', () => setCollapsed(!chat.classList.contains('is-mobile-collapsed')));
  const dialog = document.querySelector('#gameDeckDialog');
  const about = document.querySelector('#aboutDialog');
  document.querySelector('#showAbout').addEventListener('click', () => about.showModal());
  document.querySelector('#closeAbout').addEventListener('click', () => about.close());
  about.addEventListener('click', event => { if (event.target === about) about.close(); });
  let current = null, sending = false, key = '', deckKey = '';
  document.querySelector('#showGameDeck').addEventListener('click', () => dialog.showModal());
  document.querySelector('#closeGameDeck').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  installRoomExit(() => current);
  chat.querySelector('form').addEventListener('submit', async event => {
    event.preventDefault();
    if (!current || current.game || sending || !input.value.trim()) return;
    const code = current.code, text = input.value;
    sending = true; submit.disabled = true;
    status.textContent = '';
    try {
      const ok = await send('lobby-chat', { roomCode: code, text });
      if (current?.code !== code) return;
      if (ok && input.value === text) input.value = '';
      status.textContent = ok ? '' : 'Chưa gửi được. Hãy thử lại.';
    } finally { sending = false; submit.disabled = false; }
  });
  return function render(room, busy) {
    if (current?.code !== room?.code || Boolean(current?.game) !== Boolean(room?.game)) {
      setCollapsed(false);
      input.value = ''; key = ''; status.textContent = '';
    }
    current = room;
    if (room && about.open) about.close();
    chat.hidden = !room || Boolean(room.game);
    submit.disabled = busy || sending;
    input.disabled = !room || Boolean(room.game);
    if (!room?.game && dialog.open) dialog.close();
    if (!room) { list.replaceChildren(); return; }
    document.querySelector('#readyCount').textContent = room.members.length + ' người trong phòng · Chủ phòng bấm Vào game để bắt đầu.';
    if (!room.game) {
      let valid = false;
      try { validateRoles(room.roleConfig, room.members.length); valid = true; } catch {}
      document.querySelector('#roleConfigStatus').textContent = valid ? 'Bộ vai đã lưu. Chủ phòng có thể bắt đầu khi đủ 5 người.' : 'Chủ phòng cần lưu bộ vai khớp với số người trong phòng (ít nhất 5).';
    }
    const signature = JSON.stringify(room.lobbyMessages);
    if (key !== signature) {
      const bottom = list.scrollHeight - list.scrollTop - list.clientHeight < 40;
      list.replaceChildren();
      for (const message of room.lobbyMessages || []) {
        const item = document.createElement('li'), name = document.createElement('strong');
        name.textContent = message.name + ': ';
        item.append(name, document.createTextNode(message.text)); list.append(item);
      }
      if (bottom) list.scrollTop = list.scrollHeight;
      key = signature;
    }
    const nextDeckKey = JSON.stringify([room.code, room.roleConfig]);
    if (deckKey === nextDeckKey) return;
    deckKey = nextDeckKey;
    const deck = document.querySelector('#gameDeckList');
    deck.replaceChildren();
    for (const [role, count] of Object.entries(room.roleConfig || {})) {
      if (!count) continue;
      const item = document.createElement('li');
      const image = document.createElement('img');
      image.src = '/assets/role/role-' + role + '.png'; image.alt = '';
      const label = document.createElement('span');
      label.textContent = (ROLE_LABELS[role] || role) + ' × ' + count;
      item.append(image, label); deck.append(item);
    }
  };
}
