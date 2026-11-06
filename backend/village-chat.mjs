const chats = new Map();
const allowed = (game, id) => game?.version === 1 && game.phase !== "ended" && game.players.some(p => p.id === id);
const canSend = (game,id) => allowed(game,id) && game.phase === "voting" && game.players.some(p => p.id === id && p.alive);
export function readVillageChat(game,id) {
  return allowed(game,id) ? { gameId: game.id, canSend: canSend(game,id), messages: chats.get(game.id)?.messages || [] } : null;
}
export function clearVillageChat(id) { chats.delete(id); }
export function sendVillageChat(game,id,body) {
  const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
  if(!canSend(game,id)) fail(403,"Chỉ người còn sống được nhắn trong lượt thảo luận ban ngày.");
  if(body.gameId!==game.id) fail(409,"Ván đã thay đổi.");
  if(typeof body.text!=="string") fail(400,"Tin nhắn không hợp lệ.");
  const text=body.text.trim();
  if(!text || text.length>300 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) fail(400,"Tin nhắn cần từ 1 đến 300 ký tự.");
  const chat=chats.get(game.id)||{messages:[],sequence:0};
  chat.messages.push({id:++chat.sequence,name:game.players.find(p=>p.id===id).name,text});
  chat.messages=chat.messages.slice(-50);chats.set(game.id,chat);
}
