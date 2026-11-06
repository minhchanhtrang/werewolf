import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createDatabase, initializeDatabase } from "./database.mjs";
import { pruneAbandonedRooms, touchRoom } from "./room-cleanup.mjs";
import { activeRooms, persistGame, forgetResult } from "./game-storage.mjs";
import { advanceRoom } from "./game-clock.mjs";
import { sendWolfChat, readWolfChat } from "./wolf-chat.mjs";

test("Abandoned rooms: expiry, heartbeat, cascade, chat cleanup and locked rooms", {
  skip: !process.env.PGPASSWORD || !process.env.PGDATABASE
}, async t => {
  const pool = createDatabase();
  const users = [], codes = [];
  t.after(async () => {
    for (const code of codes) forgetResult(code);
    try { await pool.query("DELETE FROM ww_users WHERE id=ANY($1::int[])", [users]); }
    finally { await pool.end(); }
  });
  await initializeDatabase(pool);
  for (let i = 0; i < 4; i++) {
    const user = await pool.query("INSERT INTO ww_users(username,password_hash) VALUES($1,'test-only') RETURNING id", ["clean_"+randomBytes(7).toString("hex")]);
    users.push(user.rows[0].id);
    const code = randomBytes(3).toString("hex").toUpperCase(); codes.push(code);
    await pool.query("INSERT INTO ww_rooms(code,host_id) VALUES($1,$2)", [code, users[i]]);
    await pool.query("INSERT INTO ww_room_members(user_id,room_code) VALUES($1,$2)", [users[i], code]);
  }
  const game = { id: randomBytes(12).toString("hex"), version: 1, phase: "night", players: [
    {id: users[1], name: "Wolf", alive: true, role: "wolf"},
    {id: -1, name: "Bot", alive: true, role: "wolf"}
  ] };
  await persistGame(pool, codes[1], game);
  sendWolfChat(game, users[1], {gameId: game.id, text: "Temporary"});
  await pool.query("UPDATE ww_rooms SET last_active_at=NOW()-INTERVAL '11 minutes' WHERE code=ANY($1::text[])", [codes]);
  await touchRoom(pool, codes[2]);
  const lock = await pool.connect();
  try {
    await lock.query("BEGIN");
    await lock.query("SELECT code FROM ww_rooms WHERE code=$1 FOR UPDATE", [codes[3]]);
    await pruneAbandonedRooms(pool);
    const remaining = await pool.query("SELECT code FROM ww_rooms WHERE code=ANY($1::text[])", [codes]);
    assert.deepEqual(remaining.rows.map(r=>r.code).sort(), codes.slice(2).sort());
    assert.equal((await pool.query("SELECT 1 FROM ww_room_members WHERE user_id=ANY($1::int[])", [users.slice(0,2)])).rowCount, 0);
    assert.equal(activeRooms.has(codes[1]), false);
    assert.equal(readWolfChat(game, users[1]).messages.length, 0);
    assert.equal((await pool.query("SELECT 1 FROM ww_users WHERE id=ANY($1::int[])", [users])).rowCount, 4);
  } finally { await lock.query("ROLLBACK"); lock.release(); }
  await pruneAbandonedRooms(pool);
  assert.equal((await pool.query("SELECT 1 FROM ww_rooms WHERE code=$1", [codes[3]])).rowCount, 0);
  activeRooms.add(codes[0]);
  await advanceRoom(pool, codes[0]);
  assert.equal(activeRooms.has(codes[0]), false);
});
