import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes, createHash } from "node:crypto";
import { createDatabase, initializeDatabase } from "./database.mjs";
import { createRooms } from "./rooms.mjs";

test("PostgreSQL: phòng chờ, quay lại, sẵn sàng, giới hạn chỗ và chuyển chủ", {
  skip: !process.env.PGPASSWORD || !process.env.PGDATABASE
}, async t => {
  const pool = createDatabase();
  const ids = [];
  const cookies = [];
  let handler = createRooms(pool);
  const server = createServer((req, res) => handler(req, res, new URL(req.url, "http://localhost").pathname));
  t.after(async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    try { await pool.query("DELETE FROM ww_users WHERE id=ANY($1::int[])", [ids]); }
    finally { await pool.end(); }
  });
  await initializeDatabase(pool);
  for (let i = 0; i < 12; i++) {
    const result = await pool.query("INSERT INTO ww_users(username,password_hash) VALUES($1,$2) RETURNING id", ["room_" + randomBytes(7).toString("hex"), "test-only"]);
    const id = result.rows[0].id;
    ids.push(id);
    const token = randomBytes(32).toString("hex");
    cookies.push("ww_session=" + token);
    await pool.query("INSERT INTO ww_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)", [createHash("sha256").update(token).digest("hex"), id, new Date(Date.now() + 60000)]);
  }
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function api(index, action, body, source = origin) {
    const response = await fetch(origin + "/api/rooms/" + action, {
      method: body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Origin: source, ...(cookies[index] ? { Cookie: cookies[index] } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, data: await response.json() };
  }

  assert.equal((await api(-1, "current")).status,401);
  assert.equal((await api(0,"create",{},"http://other.invalid")).status,403);
  const created=await api(0,"create",{});
  assert.equal(created.status,200);
  const code=created.data.room.code;
  const first = await fetch(origin + "/api/rooms/current", { headers: { Cookie: cookies[0] } });
  const tag = first.headers.get("ETag"); await first.json();
  await pool.query("UPDATE ww_rooms SET last_active_at=NOW()-INTERVAL '2 minutes' WHERE code=$1", [code]);
  const unchanged = await fetch(origin + "/api/rooms/current", { headers: { Cookie: cookies[0], "If-None-Match": tag } });
  assert.equal(unchanged.status, 304);
  assert.equal((await pool.query("SELECT last_active_at > NOW()-INTERVAL '10 seconds' AS fresh FROM ww_rooms WHERE code=$1", [code])).rows[0].fresh, true);
  assert.equal((await api(1,"join",{code})).status,200);
  assert.equal((await api(1,"kick",{userId:ids[0]})).status,403);
  assert.equal((await api(0,"kick",{userId:ids[0]})).status,400);
  assert.equal((await api(0,"kick",{userId:-1})).status,400);
  assert.equal((await api(0,"kick",{userId:String(ids[1])})).status,400);
  assert.equal((await api(2,"create",{})).status,200);
  assert.equal((await api(0,"kick",{userId:ids[2]})).status,404);
  assert.ok((await api(2,"current")).data.room);
  await api(2,"leave",{});
  assert.equal((await api(0,"kick",{userId:ids[1]})).status,200);
  assert.equal((await api(1,"current")).data.room,null);
  assert.equal((await api(0,"kick",{userId:ids[1]})).status,404);
  await api(1,"join",{code});
  assert.equal((await api(0,"start",{})).status,409);
  for(let i=0;i<3;i++){
    const added=await api(0,"bots",{fill:true});
    assert.equal(added.data.room.members.filter(m=>m.bot).length,i+1);
  }
  assert.equal((await api(1,"config",{roles:{wolf:1,witch:1,villager:3}})).status,403);
  assert.equal((await api(0,"config",{roles:{wolf:1,villager:2}})).status,400);
  assert.equal((await api(0,"config",{roles:{wolf:1,witch:1,villager:3}})).status,200);
  assert.equal((await api(0,"ready",{ready:true})).status,200);
  const changedConfig = await api(0,"config",{roles:{wolf:1,seer:1,villager:3}});
  assert.equal(changedConfig.status,200);
  assert.equal(changedConfig.data.room.members.find(m=>m.id===ids[0]).ready,true);
  assert.equal(changedConfig.data.room.members.find(m=>m.id===ids[1]).ready,false);
  assert.equal((await api(0,"start",{})).status,409);
  await api(1,"ready",{ready:true});
  const savedConfig = await api(0,"config",{roles:{wolf:1,witch:1,villager:3}});
  assert.equal(savedConfig.status,200);
  assert.ok(savedConfig.data.room.members.every(m=>m.ready));
  const unchangedConfig = await api(0,"config",{roles:{wolf:1,witch:1,villager:3}});
  assert.ok(unchangedConfig.data.room.members.every(m=>m.ready));
  assert.equal((await api(1,"start",{})).status,403);
  const started=await api(0,"start",{});
  assert.equal(started.status,200);
  assert.equal(started.data.room.game.roster.length,5);
  assert.equal(started.data.room.game.phase,"intro");
  const secret=(await pool.query("SELECT role_state FROM ww_rooms WHERE code=$1",[code])).rows[0].role_state;
  assert.equal(secret.players.filter(p=>p.role==="witch").length,1);
  assert.equal(secret.players.filter(p=>p.role==="wolf").length,1);
  assert.equal(new Set(secret.players.map(p=>p.character)).size,5);
  assert.ok(started.data.room.game.roster.every(p=>!("role" in p)));
  assert.equal((await api(0,"act",{phaseId:999,targetId:ids[1]})).status,409);
  assert.equal((await api(2,"join",{code})).status,409);
  assert.equal((await api(2,"wolf-chat",{gameId:secret.id,text:"not a member"})).status,404);
  assert.equal((await api(1,"reset",{gameId:secret.id})).status,403);
  assert.equal((await api(0,"reset",{gameId:"old"})).status,409);
  const replay = await api(0,"reset",{gameId:secret.id});
  assert.equal(replay.data.room.game.replayVote.yes,1);
  assert.equal(replay.data.room.game.replayVote.required,2);
  const refused = await api(1,"replay-vote",{gameId:secret.id,voteId:replay.data.room.game.replayVote.id,agree:false});
  assert.equal(refused.data.room.game.replayVote.status,"rejected");
  const retry = await api(0,"reset",{gameId:secret.id});
  const approved = await api(1,"replay-vote",{gameId:secret.id,voteId:retry.data.room.game.replayVote.id,agree:true});
  assert.equal(approved.data.room.game,null);
  assert.equal(approved.data.room.code,code);
  assert.ok(approved.data.room.members.filter(m=>!m.bot).every(m=>!m.ready));
  assert.equal(approved.data.room.roleConfig.wolf,1);
  assert.equal((await pool.query("SELECT role_state FROM ww_rooms WHERE code=$1",[code])).rows[0].role_state,null);
  await pool.query("UPDATE ww_rooms SET role_state=$1::jsonb WHERE code=$2", [JSON.stringify(secret),code]);
  const chatGame = structuredClone(secret);
  chatGame.players.forEach((player, index) => { player.role = index < 2 ? "wolf" : "villager"; });
  await pool.query("UPDATE ww_rooms SET role_state=$1::jsonb WHERE code=$2", [JSON.stringify(chatGame),code]);
  assert.equal((await api(0,"wolf-chat",{gameId:secret.id,text:"private test"})).status,200);
  assert.equal((await api(1,"current")).data.room.wolfChat.messages[0].text,"private test");
  const kickedDuringGame = await api(0,"kick",{userId:ids[1]});
  assert.equal(kickedDuringGame.status,409);
  assert.equal((await api(1,"current")).data.room.code,code);
  assert.equal((await api(1,"current")).data.room.game.roster.find(p=>p.id===ids[1]).alive,true);
  chatGame.players[1].alive = false;
  await pool.query("UPDATE ww_rooms SET role_state=$1::jsonb WHERE code=$2", [JSON.stringify(chatGame),code]);
  assert.equal((await api(1,"current")).data.room.wolfChat,null);
  await pool.query("UPDATE ww_rooms SET role_state=$1::jsonb WHERE code=$2", [JSON.stringify(secret),code]);
  handler=createRooms(pool);
  assert.equal((await api(0,"current")).data.room.game.myRole,started.data.room.game.myRole);
  await pool.query("UPDATE ww_rooms SET role_state=jsonb_set(role_state,'{phase}','\"ended\"'::jsonb) WHERE code=$1",[code]);
  assert.equal((await api(0,"current")).data.room.game.phase,"ended");
  assert.equal((await api(0,"kick",{userId:ids[1]})).status,409);
  assert.equal((await pool.query("SELECT role_state FROM ww_rooms WHERE code=$1",[code])).rows[0].role_state,null);
  assert.equal((await api(1,"reset",{})).status,403);
  assert.equal((await api(0,"reset",{})).data.room.game,null);
  await api(0,"leave",{});
  assert.equal((await api(1,"current")).data.room.host_id,ids[1]);
  await api(1,"leave",{});
  assert.equal((await api(1,"current")).data.room,null);
});
