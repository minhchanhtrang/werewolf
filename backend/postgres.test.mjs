import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { randomBytes } from "node:crypto";
import { createDatabase } from "./database.mjs";
import { createAuth } from "./auth.mjs";

test("PostgreSQL thật: đăng ký, đăng nhập, phiên và đăng xuất", {
  skip: !process.env.PGPASSWORD || !process.env.PGDATABASE
}, async t => {
  const pool = createDatabase();
  const username = "test_" + randomBytes(8).toString("hex");
  const password = randomBytes(2).toString("hex");
  const auth = createAuth(pool);
  const server = createServer((request, response) => auth(request, response, new URL(request.url, "http://localhost").pathname));
  t.after(async () => {
    await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
    try {
      // Chỉ xóa tài khoản do chính bài kiểm tra này tạo, phiên bị xóa theo FK.
      await pool.query("DELETE FROM ww_users WHERE username=$1", [username]);
    } finally { await pool.end(); }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function request(route, body, cookie) {
    const response = await fetch(origin + "/api/auth/" + route, {
      method: body ? "POST" : "GET",
      headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  assert.equal((await request("register", { username, password })).status, 201);
  const saved = await pool.query("SELECT password_hash FROM ww_users WHERE username=$1", [username]);
  assert.notEqual(saved.rows[0].password_hash, password);
  assert.equal((await request("register", { username, password })).status, 409);
  assert.equal((await request("login", { username, password: "!" })).status, 401);
  const login = await request("login", { username, password });
  assert.equal(login.status, 200);
  assert.equal((await request("me", undefined, login.cookie)).data.user.username, username);
  assert.equal((await request("logout", {}, login.cookie)).status, 200);
  assert.equal((await request("me", undefined, login.cookie)).data.user, null);
});
