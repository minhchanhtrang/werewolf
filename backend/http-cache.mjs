import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

export function roomTag(room) {
  const snapshot = room?.game ? { ...room, game: { ...room.game, serverNow: undefined } } : room;
  return '"' + createHash("sha256").update(JSON.stringify(snapshot)).digest("hex") + '"';
}

export function encodeBody(request, body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const accepts = (request?.headers["accept-encoding"] || "").split(",").some(item => /^gzip(?:\s*;|\s*$)/i.test(item.trim()) && !/;\s*q=0(?:\.0*)?\s*$/i.test(item));
  if (buffer.length >= 512 && accepts) return { body: gzipSync(buffer), encoding: "gzip" };
  return { body: buffer, encoding: null };
}
