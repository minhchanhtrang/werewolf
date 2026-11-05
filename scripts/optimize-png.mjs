// Nén lại IDAT lossless, giữ nguyên dữ liệu pixel đã lọc và mọi metadata PNG.
import { readFile, writeFile, readdir } from "node:fs/promises";
import { inflateSync, deflateSync, constants } from "node:zlib";
import path from "node:path";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 4, "ascii"); data.copy(out, 8);
  let crc = 0xffffffff;
  for (const byte of out.subarray(4, -4)) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
  return out;
}

let before = 0, after = 0, changed = 0;
for (const dir of ["backgrounds", "role", "characters", "effects"]) {
  const folder = path.join("assets", dir);
  for (const name of await readdir(folder)) {
    if (!name.endsWith(".png") || (["characters", "effects"].includes(dir) && !name.endsWith("-game.png"))) continue;
    const file = path.join(folder, name), original = await readFile(file);
    if (original.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("Invalid PNG: " + file);
    const parts = [], data = [];
    for (let pos = 8; pos < original.length;) {
      const length = original.readUInt32BE(pos), type = original.toString("ascii", pos + 4, pos + 8);
      parts.push({ type, bytes: original.subarray(pos, pos + length + 12) });
      if (type === "IDAT") data.push(original.subarray(pos + 8, pos + 8 + length));
      pos += length + 12;
    }
    const compressed = Buffer.concat(data), raw = inflateSync(compressed);
    let best = compressed;
    for (const strategy of [constants.Z_DEFAULT_STRATEGY, constants.Z_FILTERED]) {
      const candidate = deflateSync(raw, { level: 9, strategy });
      if (candidate.length < best.length) best = candidate;
    }
    if (!inflateSync(best).equals(raw)) throw new Error("Lossless check failed: " + file);
    let replaced = false;
    const result = Buffer.concat([original.subarray(0, 8), ...parts.flatMap(part => {
      if (part.type !== "IDAT") return [part.bytes];
      if (replaced) return [];
      replaced = true; return [chunk("IDAT", best)];
    })]);
    before += original.length;
    if (result.length < original.length) { await writeFile(file, result); after += result.length; changed++; }
    else after += original.length;
  }
}
console.log(JSON.stringify({ changed, beforeMB: +(before / 1048576).toFixed(2), afterMB: +(after / 1048576).toFixed(2), savedPercent: +((1 - after / before) * 100).toFixed(1) }));
