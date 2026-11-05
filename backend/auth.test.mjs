import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { createAuth } from "./auth.mjs";
import { hashPassword, verifyPassword, validateCredentials } from "./password.mjs";

test("Mật khẩu dùng salt riêng và xác minh đúng/sai", async () => {
  const first = await hashPassword("password-test-123");
  const second = await hashPassword("password-test-123");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("password-test-123", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
  assert.equal(await verifyPassword("password-test-123", "invalid"), false);
  assert.ok(validateCredentials("bad name", "password-test-123"));
  assert.ok(validateCredentials("valid_name", "short"));
  assert.ok(validateCredentials("valid_name", ""));
  assert.equal(validateCredentials("valid_name", "1"), null);
  assert.equal(validateCredentials("valid_name", "1234"), null);
  assert.ok(validateCredentials("valid_name", "12345"));
});

// Kho dữ liệu giả cho kiểm tra HTTP; không thay thế kiểm tra kết nối PostgreSQL thật.
function memoryPool() {
  const users = [];
  const sessions = new Map();
  return { users, sessions, async query(sql, values = []) {
    if (sql.startsWith("INSERT INTO ww_users")) {
      if (users.some(user => user.username === values[0])) throw Object.assign(new Error(), { code: "23505" });
      users.push({ id: users.length + 1, username: values[0], password_hash: values[1] });
    } else if (sql.startsWith("SELECT id,username")) {
      return { rows: users.filter(user => user.username === values[0]) };
    } else if (sql.startsWith("INSERT INTO ww_sessions")) {
      sessions.set(values[0], { userId: values[1], expires: values[2] });
    } else if (sql.startsWith("DELETE FROM ww_sessions WHERE token_hash")) {
      sessions.delete(values[0]);
    } else if (sql.startsWith("SELECT u.id")) {
      const session = sessions.get(values[0]);
      const user = session && session.expires > new Date() ? users.find(user => user.id === session.userId) : null;
      return { rows: user ? [{ id: user.id, username: user.username }] : [] };
    }
    return { rows: [] };
  } };
}

async function fixture(t, pool) {
  const auth = createAuth(pool);
  const server = createServer((request, response) => auth(request, response, new URL(request.url, "http://localhost").pathname));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const origin = `http://127.0.0.1:${server.address().port}`;
  return async (route, data, cookie, overrideOrigin = origin) => {
    const response = await fetch(origin + "/api/auth/" + route, {
      method: data === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", Origin: overrideOrigin, ...(cookie ? { Cookie: cookie } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie") };
  };
}

test("Đăng ký, trùng tên, đăng nhập, phục hồi phiên và đăng xuất qua HTTP", async t => {
  const pool = memoryPool();
  const api = await fixture(t, pool);
  const credentials = { username: "Player_01", password: "1234" };
  assert.equal((await api("register", credentials)).status, 201);
  assert.equal(pool.users[0].username, "player_01");
  assert.notEqual(pool.users[0].password_hash, credentials.password);
  assert.equal((await api("register", { ...credentials, username: "player_01" })).status, 409);
  assert.equal((await api("login", { ...credentials, password: "4321" })).status, 401);
  const login = await api("login", credentials);
  assert.equal(login.status, 200);
  assert.match(login.cookie, /HttpOnly/);
  assert.match(login.cookie, /SameSite=Strict/);
  assert.deepEqual(login.body.user, { id: 1, username: "player_01" });
  assert.equal("password_hash" in login.body.user, false);
  const cookie = login.cookie.split(";")[0];
  assert.equal((await api("me", undefined, cookie)).body.user.username, "player_01");
  // Phiên hết hạn bị từ chối.
  const session = [...pool.sessions.values()][0];
  session.expires = new Date(0);
  assert.equal((await api("me", undefined, cookie)).body.user, null);
  const again = await api("login", credentials);
  const newCookie = again.cookie.split(";")[0];
  assert.equal((await api("logout", {}, newCookie)).status, 200);
  assert.equal((await api("me", undefined, newCookie)).body.user, null);
});

test("Chặn nguồn ngoài, đầu vào không hợp lệ và giới hạn số lần thử", async t => {
  const api = await fixture(t, memoryPool());
  assert.equal((await api("login", {}, undefined, "http://other-site.invalid")).status, 403);
  assert.equal((await api("register", { username: "a", password: "short" })).status, 400);
  assert.equal((await api("missing", {})).status, 404);
  for (let i = 0; i < 20; i++) await api("login", {});
  assert.equal((await api("login", {})).status, 429);
});

test("Thiếu cấu hình database trả thông báo 503", async t => {
  const api = await fixture(t, null);
  assert.equal((await api("me")).status, 503);
});
