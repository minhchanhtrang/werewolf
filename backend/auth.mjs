import { createHash, randomBytes } from "node:crypto";
import { hashPassword, verifyPassword, validateCredentials } from "./password.mjs";
import { allowedOrigin } from "./origin.mjs";
import { encodeBody } from "./http-cache.mjs";

const lifetime = 7 * 24 * 60 * 60;
const digest = value => createHash("sha256").update(value).digest("hex");
const cookie = (value, maxAge) => `ww_session=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
const tokenFrom = request => {
  const token = (request.headers.cookie || "").split(";").map(x => x.trim()).find(x => x.startsWith("ww_session="))?.slice(11);
  return /^[a-f0-9]{64}$/.test(token || "") ? token : null;
};

export function json(response, status, body, request, extraHeaders = {}) {
  const encoded = encodeBody(request, JSON.stringify(body));
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", Vary: "Accept-Encoding", ...(encoded.encoding ? { "Content-Encoding": encoded.encoding } : {}), ...extraHeaders });
  response.end(encoded.body);
}

export async function readBody(request, maxBytes = 4096) {
  if (!request.headers["content-type"]?.startsWith("application/json")) throw Object.assign(new Error("Chỉ nhận dữ liệu JSON."), { status: 415 });
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw Object.assign(new Error("Dữ liệu quá lớn."), { status: 413 });
  }
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw Object.assign(new Error("Dữ liệu JSON không hợp lệ."), { status: 400 }); }
}

export async function getSessionUser(pool, request) {
  const token = tokenFrom(request);
  if (!token) return null;
  const result = await pool.query(`SELECT u.id, u.username FROM ww_sessions s JOIN ww_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()`, [digest(token)]);
  return result.rows[0] || null;
}

export function createAuth(pool) {
  const attempts = new Map();
  let activeHashes = 0;
  // Cùng chi phí băm khi tên đăng nhập không tồn tại.
  const dummyHash = hashPassword(randomBytes(32).toString("hex"));

  return async function auth(request, response, pathname) {
    const routes = ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me"];
    if (!routes.includes(pathname)) return json(response, 404, { error: "Không có API này." });
    if (request.method !== (pathname.endsWith("/me") ? "GET" : "POST")) return json(response, 405, { error: "Phương thức không hợp lệ." });
    if (request.method === "POST" && !allowedOrigin(request)) {
      return json(response, 403, { error: "Yêu cầu phải được gửi từ trang game." });
    }
    if (!pool) return json(response, 503, { error: "Chưa kết nối tài khoản. Hãy cấu hình PostgreSQL trong .env rồi khởi động lại server." });
    try {
      const token = tokenFrom(request);
      if (pathname.endsWith("/me")) {
        const result = token ? await pool.query(`SELECT u.id, u.username FROM ww_sessions s JOIN ww_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW()`, [digest(token)]) : { rows: [] };
        return json(response, 200, { user: result.rows[0] || null });
      }
      if (pathname.endsWith("/logout")) {
        if (token) await pool.query("DELETE FROM ww_sessions WHERE token_hash=$1", [digest(token)]);
        response.setHeader("Set-Cookie", cookie("", 0));
        return json(response, 200, { user: null });
      }

      const data = await readBody(request);
      const now = Date.now();
      for (const [key, value] of attempts) if (now >= value.until) attempts.delete(key);
      // Không khóa cả nhóm người chơi dùng chung IP/proxy của hosting.
      const ip = request.socket.remoteAddress + ":" + (typeof data?.username === "string" ? data.username.toLowerCase().slice(0, 24) : "");
      const limit = attempts.get(ip) || { count: 0, until: now + 15 * 60 * 1000 };
      attempts.set(ip, limit);
      if (++limit.count > 20) return json(response, 429, { error: "Đã thử quá nhiều lần. Hãy chờ 15 phút." });
      const error = validateCredentials(data?.username, data?.password);
      if (error) return json(response, 400, { error });
      if (activeHashes >= 2) return json(response, 429, { error: "Server đang bận. Hãy thử lại sau ít giây." });
      activeHashes++;
      try {
        const username = data.username.toLowerCase();
        if (pathname.endsWith("/register")) {
          const passwordHash = await hashPassword(data.password);
          await pool.query("INSERT INTO ww_users(username,password_hash) VALUES($1,$2)", [username, passwordHash]);
          return json(response, 201, { message: "Đăng ký thành công. Bạn có thể đăng nhập." });
        }
        const result = await pool.query("SELECT id,username,password_hash FROM ww_users WHERE username=$1", [username]);
        const user = result.rows[0];
        const valid = await verifyPassword(data.password, user?.password_hash || await dummyHash);
        if (!user || !valid) return json(response, 401, { error: "Tên đăng nhập hoặc mật khẩu không đúng." });
        const session = randomBytes(32).toString("hex");
        await pool.query("DELETE FROM ww_sessions WHERE expires_at<=NOW()");
        await pool.query("INSERT INTO ww_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)", [digest(session), user.id, new Date(Date.now() + lifetime * 1000)]);
        if (token) await pool.query("DELETE FROM ww_sessions WHERE token_hash=$1", [digest(token)]);
        response.setHeader("Set-Cookie", cookie(session, lifetime));
        return json(response, 200, { user: { id: user.id, username: user.username } });
      } finally { activeHashes--; }
    } catch (error) {
      if (error.code === "23505") return json(response, 409, { error: "Tên đăng nhập đã được sử dụng." });
      return json(response, error.status || 503, { error: error.status ? error.message : "Không thể xử lý tài khoản lúc này. Kiểm tra kết nối PostgreSQL." });
    }
  };
}
