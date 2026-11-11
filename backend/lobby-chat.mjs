const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };

export function appendLobbyMessage(messages, user, text, now = Date.now()) {
  if (typeof text !== 'string' || !text.trim() || text.trim().length > 300 || /[\u0000-\u001f\u007f]/.test(text)) {
    fail(400, 'Tin nhắn cần từ 1 đến 300 ký tự, không chứa ký tự điều khiển.');
  }
  const previous = messages.findLast(message => message.userId === user.id);
  if (previous && now - previous.sentAt < 500) fail(429, 'Bạn gửi quá nhanh. Hãy chờ một chút.');
  return [...messages, { userId: user.id, name: user.username, text: text.trim(), sentAt: now }].slice(-50);
}
