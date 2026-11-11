import { getChatPrivacy } from './chat-privacy.js';

export function createWolfChat(send) {
  const privacy = getChatPrivacy();
  const panel = document.querySelector("#wolfChat");
  const list = document.querySelector("#wolfChatMessages");
  const form = document.querySelector("#wolfChatForm");
  const input = document.querySelector("#wolfChatInput");
  const button = document.querySelector("#wolfChatSend");
  const status = document.querySelector("#wolfChatStatus");
  const toggle = document.querySelector("#toggleWolfChat");
  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.textContent = open ? "Thu gọn" : "Mở chat";
    if (open) list.scrollTop = list.scrollHeight;
  });
  let current = null, signature = "", sending = false, epoch = 0;
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!current || button.disabled || sending || !input.value.trim()) return;
    const gameId = current.gameId, text = input.value, operation = epoch;
    sending = true; button.disabled = true;
    try {
      const ok = await send({ gameId, text });
      if (operation !== epoch) return;
      if (ok && input.value === text) input.value = "";
      status.textContent = ok ? "" : "Chưa gửi được. Hãy thử lại.";
    } finally { if (operation === epoch) { sending = false; button.disabled = !current; } }
  });
  return function render(room, busy) {
    const next = room?.wolfChat || null;
    if (next?.gameId !== current?.gameId || Boolean(next) !== Boolean(current)) {
      epoch++; sending = false; input.value = ""; status.textContent = ""; signature = "";
      list.replaceChildren();
      panel.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false"); toggle.textContent = "Mở chat";
    }
    current = next;
    panel.hidden = !current;
    privacy.update(current);
    button.disabled = !current || busy || sending;
    input.disabled = !current;
    if (!current) return;
    const key = JSON.stringify(current.messages);
    if (key !== signature) {
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 45;
      list.replaceChildren();
      for (const message of current.messages) {
        const item = document.createElement("li"), name = document.createElement("strong"), text = document.createElement("span");
        name.textContent = message.name + ": "; text.textContent = message.text;
        item.append(name, text); list.append(item);
      }
      if (atBottom) list.scrollTop = list.scrollHeight;
      signature = key;
    }
  };
}
