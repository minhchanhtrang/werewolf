import test from "node:test";
import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { canWolfChat, readWolfChat, sendWolfChat, clearWolfChat } from "./wolf-chat.mjs";
import { roomTag, encodeBody } from "./http-cache.mjs";

const fixture = () => ({ id: "chat-test", version: 1, phase: "night", players: [
  { id: 1, role: "wolf", alive: true, name: "Wolf A" },
  { id: 2, role: "wolf", alive: true, name: "Wolf B" },
  { id: 3, role: "villager", alive: true, name: "Villager" },
  { id: 4, role: "wolf", alive: false, name: "Ghost" }
] });

test("Chat Sói: không lộ cho Dân/người chết, gửi liên tiếp và chặn sai ván", () => {
  const game = fixture();
  try {
    assert.ok(canWolfChat(game, 1));
    sendWolfChat(game, 1, { gameId: game.id, text: "<b>hello</b>" }, 10000);
    assert.equal(readWolfChat(game, 2).messages[0].text, "<b>hello</b>");
    for (const id of [3, 4, 999]) {
      assert.equal(readWolfChat(game, id), null);
      assert.throws(() => sendWolfChat(game, id, { gameId: game.id, text: "x" }), { status: 403 });
    }
    assert.doesNotThrow(() => sendWolfChat(game, 1, { gameId: game.id, text: "Tin tiếp theo" }, 11000));
    assert.throws(() => sendWolfChat(game, 2, { gameId: "old", text: "x" }), { status: 409 });
    for (const text of [" ", "x".repeat(301), 5]) assert.throws(() => sendWolfChat(game, 2, { gameId: game.id, text }), { status: 400 });
    for (let i = 0; i < 40; i++) sendWolfChat(game, 2, { gameId: game.id, text: String(i) }, 20000 + i * 2000);
    assert.equal(readWolfChat(game, 1).messages.length, 30);
    game.players[1].alive = false;
    assert.equal(readWolfChat(game, 1), null);
    game.players[1].alive = true; game.phase = "ended";
    assert.equal(readWolfChat(game, 1), null);
    clearWolfChat(game.id); game.phase = "night";
    assert.equal(readWolfChat(game, 1).messages.length, 0);
  } finally { clearWolfChat(game.id); }
});

test("ETag không đổi vì đồng hồ; vẫn đổi khi phiếu hoặc chat riêng đổi", () => {
  const room = { game: { serverNow: 1000, myVote: null }, wolfChat: null };
  const original = roomTag(room);
  assert.equal(roomTag({ ...room, game: { ...room.game, serverNow: 2000 } }), original);
  assert.notEqual(roomTag({ ...room, game: { ...room.game, myVote: 5 } }), original);
  assert.notEqual(roomTag({ ...room, wolfChat: { messages: [{ text: "secret" }] } }), original);
});

test("Gzip JSON giảm dung lượng và giải nén đúng; tôn trọng q=0", () => {
  const body = JSON.stringify({ messages: Array(30).fill({ name: "Wolf", text: "Message for the team" }) });
  const encoded = encodeBody({ headers: { "accept-encoding": "br, gzip" } }, body);
  assert.equal(encoded.encoding, "gzip");
  assert.equal(gunzipSync(encoded.body).toString(), body);
  assert.ok(encoded.body.length < Buffer.byteLength(body) / 2);
  assert.equal(encodeBody({ headers: { "accept-encoding": "gzip;q=0" } }, body).encoding, null);
});
