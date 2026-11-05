import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { createDatabase, initializeDatabase } from "./backend/database.mjs";
import { createAuth } from "./backend/auth.mjs";
import { createRooms } from "./backend/rooms.mjs";
import { startGameClock } from "./backend/game-clock.mjs";
import { encodeBody } from "./backend/http-cache.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const envFile = path.join(root, ".env");
if (process.env.NODE_ENV !== "production" && existsSync(envFile)) loadEnvFile(envFile);
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
if (process.env.NODE_ENV === "production" && !(process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL)) throw new Error("Thiếu APP_ORIGIN (địa chỉ HTTPS của game).");
let pool = null;
if (process.env.DATABASE_URL || (process.env.PGPASSWORD && process.env.PGDATABASE)) {
  const database = createDatabase();
  database.on("error", () => console.error("Kết nối PostgreSQL bị gián đoạn."));
  try {
    await initializeDatabase(database);
    pool = database;
    console.log("Đã kết nối PostgreSQL và chuẩn bị bảng tài khoản.");
  } catch (error) {
    await database.end();
    console.error("Chưa kết nối được PostgreSQL. Kiểm tra .env, database và dịch vụ PostgreSQL. Mã lỗi:", error.code || "UNKNOWN");
  }
} else {
  console.log("Chưa có cấu hình PostgreSQL trong .env. Game vẫn chơi được ở chế độ khách.");
}
const auth = createAuth(pool);
const rooms = createRooms(pool);
if (process.env.NODE_ENV === "production" && !pool) throw new Error("Không thể chạy game khi chưa kết nối PostgreSQL.");
startGameClock(pool);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png" };

// Chỉ phục vụ các tài nguyên công khai của game, trên máy hiện tại.
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/healthz" && request.method === "GET") {
      response.writeHead(pool ? 200 : 503, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: Boolean(pool) }));
      return;
    }
    if (pathname.startsWith("/api/rooms/")) return await rooms(request, response, pathname);
    if (pathname.startsWith("/api/")) return await auth(request, response, pathname);
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405).end();
      return;
    }
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    if (relative !== "index.html" && !/^(css|js)\/[a-zA-Z0-9_-]+\.(css|js)$/.test(relative) && !/^assets\/(backgrounds|characters|effects|role)\/[a-zA-Z0-9_-]+\.png$/.test(relative)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const file = path.join(root, relative);
    const info = await stat(file);
    const tag = `W/"${info.size}-${Math.trunc(info.mtimeMs)}"`;
    const cache = "public, max-age=0, must-revalidate";
    if (request.headers["if-none-match"] === tag) {
      response.writeHead(304, { ETag: tag, "Cache-Control": cache }).end();
      return;
    }
    const original = await readFile(file);
    const encoded = relative.endsWith(".png") ? { body: original, encoding: null } : encodeBody(request, original);
    response.writeHead(200, {
      "Content-Type": types[path.extname(relative)], "Cache-Control": cache, ETag: tag, Vary: "Accept-Encoding",
      ...(encoded.encoding ? { "Content-Encoding": encoded.encoding } : {}),
      "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    });
    response.end(request.method === "HEAD" ? undefined : encoded.body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, host, () => {
  console.log(`Ma Sói đang chạy tại http://127.0.0.1:${port}`);
}).on("error", error => {
  console.error("Không mở được máy chủ:", error.message);
});
