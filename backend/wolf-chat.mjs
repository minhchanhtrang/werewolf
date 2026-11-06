const chats = new Map();

export function canWolfChat(game, userId) {
  return game?.version === 1 && game.phase !== "ended"
    && game.players.some(player => player.id === userId && player.alive && player.role === "wolf")
    && game.players.filter(player => player.alive && player.role === "wolf").length >= 2;
}

export function readWolfChat(game, userId) {
  if (!canWolfChat(game, userId)) return null;
  return { gameId: game.id, messages: chats.get(game.id)?.messages || [] };
}

export function clearWolfChat(gameId) { if (gameId) chats.delete(gameId); }

export function sendWolfChat(game, userId, body) {
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  if (!canWolfChat(game, userId)) fail(403, "Chỉ Sói còn sống được chat khi còn ít nhất 2 Sói sống.");
  if (body.gameId !== game.id) fail(409, "Ván đã thay đổi. Hãy gửi lại trong ván hiện tại.");
  if (typeof body.text !== "string") fail(400, "Tin nhắn không hợp lệ.");
  const text = body.text.trim();
  if (!text || text.length > 300 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) fail(400, "Tin nhắn cần từ 1 đến 300 ký tự.");
  const chat = chats.get(game.id) || { messages: [], sequence: 0 };
  const sender = game.players.find(player => player.id === userId);
  chat.messages.push({ id: ++chat.sequence, name: sender.name, text });
  chat.messages = chat.messages.slice(-30);
  chats.set(game.id, chat);
}
