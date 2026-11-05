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
  assert.equal((await api(1,"join",{code})).status,200);
  assert.equal((await api(0,"start",{})).status,409);
  for(let i=0;i<3;i++){
    const added=await api(0,"bots",{fill:true});
    assert.equal(added.data.room.members.filter(m=>m.bot).length,i+1);
  }
  assert.equal((await api(0,"ready",{ready:true})).status,200);
  assert.equal((await api(0,"start",{})).status,409);
  await api(1,"ready",{ready:true});
  assert.equal((await api(1,"start",{})).status,403);
  const started=await api(0,"start",{});
  assert.equal(started.status,200);
  assert.equal(started.data.room.game.roster.length,5);
  assert.equal(started.data.room.game.phase,"night");
  const secret=(await pool.query("SELECT role_state FROM ww_rooms WHERE code=$1",[code])).rows[0].role_state;
  assert.equal(secret.players.filter(p=>p.role==="witch").length,1);
  assert.equal(secret.players.filter(p=>p.role==="wolf").length,1);
  assert.equal(new Set(secret.players.map(p=>p.character)).size,5);
  assert.ok(started.data.room.game.roster.every(p=>!("role" in p)));
  assert.equal((await api(0,"act",{phaseId:999,targetId:ids[1]})).status,409);
  assert.equal((await api(2,"join",{code})).status,409);
  handler=createRooms(pool);
  assert.equal((await api(0,"current")).data.room.game.myRole,started.data.room.game.myRole);
  await pool.query("UPDATE ww_rooms SET role_state=jsonb_set(role_state,'{phase}','\"ended\"'::jsonb) WHERE code=$1",[code]);
  assert.equal((await api(0,"current")).data.room.game.phase,"ended");
  assert.equal((await pool.query("SELECT role_state FROM ww_rooms WHERE code=$1",[code])).rows[0].role_state,null);
  assert.equal((await api(1,"reset",{})).status,403);
  assert.equal((await api(0,"reset",{})).data.room.game,null);
  await api(0,"leave",{});
  assert.equal((await api(1,"current")).data.room.host_id,ids[1]);
  await api(1,"leave",{});
  assert.equal((await api(1,"current")).data.room,null);
});
