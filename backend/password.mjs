import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

export function validateCredentials(username, password) {
  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    return "Username cần 3–24 ký tự: chữ không dấu, số hoặc dấu gạch dưới.";
  }
  if (typeof password !== "string" || password.length < 1 || password.length > 4) {
    return "Mật khẩu cần từ 1 đến 4 ký tự.";
  }
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt, 64, options);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, hex] = String(stored).split("$");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{128}$/.test(hex)) return false;
  const actual = await derive(password, salt, 64, options);
  return timingSafeEqual(actual, Buffer.from(hex, "hex"));
}
