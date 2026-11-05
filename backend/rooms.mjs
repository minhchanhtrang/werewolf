import { randomBytes } from "node:crypto";
import { getSessionUser, json, readBody } from "./auth.mjs";
import { dealRoles, privateRoleView } from "./roles.mjs";
import { beginGame, act, advanceGame, leaveGame } from "./game.mjs";
import { advanceRoom } from "./game-clock.mjs";
import { MAX_PLAYERS, canStartRoom, validateRoles } from "../js/rules.js";
import { persistGame, finishedResult, forgetResult } from "./game-storage.mjs";
import { allowedOrigin } from "./origin.mjs";
import { readWolfChat, sendWolfChat } from "./wolf-chat.mjs";
import { roomTag } from "./http-cache.mjs";

const fault = (status, message) => Object.assign(new Error(message), { status });

async function currentRoom(db, userId) {
  // Một câu truy vấn để ảnh chụp phòng và thành viên nhất quán.
  const result = await db.query(`SELECT r.code,r.host_id,r.bot_count,r.role_state,r.capacity,r.role_config,
    json_agg(json_build_object('id',u.id,'username',u.username,'ready',m.ready)
      ORDER BY m.joined_at,m.user_id) AS members
    FROM ww_room_members mine JOIN ww_rooms r ON r.code=mine.room_code
    JOIN ww_room_members m ON m.room_code=r.code JOIN ww_users u ON u.id=m.user_id
    WHERE mine.user_id=$1 GROUP BY r.code,r.host_id`, [userId]);
  const row = result.rows[0];
  if (!row) return null;
  const game = row.role_state || finishedResult(row.code);
  const bots = Array.from({ length: row.bot_count }, (_, index) => ({
    id: -(index + 1), username: "Bot " + (index + 1), ready: true, bot: true
  }));
  return {
    code: row.code, host_id: row.host_id, capacity: MAX_PLAYERS, roleConfig: row.role_config,
    members: [...row.members, ...bots],
    game: privateRoleView(game, userId),
    wolfChat: readWolfChat(game, userId)
  };
}

export function createRooms(pool) {
  return async (request, response, pathname) => {
    const actions = {
      "/api/rooms/current": "GET", "/api/rooms/create": "POST",
      "/api/rooms/join": "POST", "/api/rooms/ready": "POST", "/api/rooms/leave": "POST",
      "/api/rooms/bots": "POST", "/api/rooms/config": "POST", "/api/rooms/start": "POST", "/api/rooms/reset": "POST", "/api/rooms/act": "POST", "/api/rooms/wolf-chat": "POST"
    };
    if (!actions[pathname]) return json(response, 404, { error: "Không có API phòng này." });
    if (request.method !== actions[pathname]) return json(response, 405, { error: "Phương thức không hợp lệ." });
    if (request.method === "POST" && !allowedOrigin(request)) return json(response, 403, { error: "Nguồn yêu cầu không hợp lệ." });
    if (!pool) return json(response, 503, { error: "Chưa kết nối PostgreSQL." });
    let client;
    try {
      const user = await getSessionUser(pool, request);
      if (!user) throw fault(401, "Hãy đăng nhập để vào phòng.");
      if (request.method === "GET") {
        const membership = await pool.query("SELECT room_code FROM ww_room_members WHERE user_id=$1", [user.id]);
        if (membership.rows[0]) await advanceRoom(pool, membership.rows[0].room_code);
        client = await pool.connect();
        await client.query("BEGIN");
        if (membership.rows[0]) await client.query("SELECT code FROM ww_rooms WHERE code=$1 FOR SHARE", [membership.rows[0].room_code]);
        // Đọc thành viên và ván dưới cùng một khóa phòng.
        const room = await currentRoom(client, user.id);
        await client.query("COMMIT");
        const tag = roomTag(room);
        if (request.headers["if-none-match"] === tag) {
          response.writeHead(304, { ETag: tag, "Cache-Control": "no-store" }).end();
          return;
        }
        return json(response, 200, { room }, request, { ETag: tag });
      }
      const body = await readBody(request);
      client = await pool.connect();
      await client.query("BEGIN");
      // Một tài khoản không thể tham gia hai phòng do hai yêu cầu đồng thời.
      await client.query("SELECT pg_advisory_xact_lock($1)", [user.id]);
      const mine = await client.query("SELECT room_code FROM ww_room_members WHERE user_id=$1", [user.id]);
      const code = mine.rows[0]?.room_code;
      if (pathname.endsWith("/create")) {
        if (code) throw fault(409, "Bạn đang ở một phòng. Hãy rời phòng trước.");
        let created;
        for (let attempt = 0; attempt < 5 && !created; attempt++) {
          const candidate = randomBytes(3).toString("hex").toUpperCase();
          const result = await client.query("INSERT INTO ww_rooms(code,host_id,capacity) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING code", [candidate, user.id, MAX_PLAYERS]);
          created = result.rows[0]?.code;
        }
        if (!created) throw fault(503, "Không tạo được mã phòng. Hãy thử lại.");
        await client.query("INSERT INTO ww_room_members(user_id,room_code) VALUES($1,$2)", [user.id, created]);
      } else if (pathname.endsWith("/join")) {
        if (typeof body.code !== "string" || !/^[A-F0-9]{6}$/.test(body.code.trim().toUpperCase())) throw fault(400, "Mã phòng gồm 6 chữ/số, ví dụ A12B34.");
        const target = body.code.trim().toUpperCase();
        if (code && code !== target) throw fault(409, "Hãy rời phòng hiện tại trước.");
        const room = await client.query("SELECT code,bot_count,role_state,capacity FROM ww_rooms WHERE code=$1 FOR UPDATE", [target]);
        if (!room.rows.length) throw fault(404, "Không tìm thấy phòng. Kiểm tra lại mã.");
        if (!code) {
          if (room.rows[0].role_state || finishedResult(target)) throw fault(409, "Phòng đang chơi hoặc xem kết quả. Hãy chờ quay lại phòng chờ.");
          const members = await client.query("SELECT COUNT(*)::int AS count FROM ww_room_members WHERE room_code=$1", [target]);
          if (members.rows[0].count + room.rows[0].bot_count >= MAX_PLAYERS) throw fault(409, "Bản hiện tại hỗ trợ tối đa " + MAX_PLAYERS + " người mỗi phòng. Chủ phòng có thể xóa bot để nhường chỗ.");
          await client.query("INSERT INTO ww_room_members(user_id,room_code) VALUES($1,$2)", [user.id, target]);
        }
      } else {
        if (!code) throw fault(404, "Bạn chưa ở trong phòng.");
        const room = await client.query("SELECT host_id,role_state FROM ww_rooms WHERE code=$1 FOR UPDATE", [code]);
        if (!room.rows.length) throw fault(404, "Phòng không còn tồn tại.");
        if (["/api/rooms/bots", "/api/rooms/config", "/api/rooms/start", "/api/rooms/reset"].includes(pathname)) {
          if (room.rows[0].host_id !== user.id) throw fault(403, "Chỉ chủ phòng được thực hiện thao tác này.");
          if (pathname.endsWith("/reset")) {
            await client.query("UPDATE ww_rooms SET role_state=NULL WHERE code=$1", [code]);
            forgetResult(code);
            await client.query("UPDATE ww_room_members SET ready=FALSE WHERE room_code=$1", [code]);
          } else {
            if (room.rows[0].role_state) throw fault(409, "Phòng đã chia vai. Quay lại phòng chờ trước.");
            const current = await currentRoom(client, user.id);
            if (pathname.endsWith("/config")) {
              let counts;
              try { counts = validateRoles(body.roles, current.members.length); }
              catch (error) { throw fault(400, error.message); }
              await client.query("UPDATE ww_rooms SET role_config=$1 WHERE code=$2", [JSON.stringify(counts), code]);
              await client.query("UPDATE ww_room_members SET ready=FALSE WHERE room_code=$1", [code]);
            } else if (pathname.endsWith("/bots")) {
              if (typeof body.fill !== "boolean") throw fault(400, "Yêu cầu bot không hợp lệ.");
              const humans = current.members.filter(member => !member.bot).length;
              if (body.fill && current.members.length >= current.capacity) throw fault(409, "Phòng đã đầy, không thể thêm bot.");
              const bots = current.members.length - humans;
              await client.query("UPDATE ww_rooms SET bot_count=$1 WHERE code=$2", [body.fill ? bots + 1 : 0, code]);
            } else {
              if (!canStartRoom(current.members, current.capacity)) throw fault(409, "Cần ít nhất 5 người và tất cả người thật sẵn sàng.");
              let deal;
              if (!current.roleConfig) throw fault(400, "Chủ phòng cần lưu bộ vai trước khi bắt đầu.");
              try { deal = dealRoles(current.members, current.roleConfig); }
              catch (error) { throw fault(400, error.message); }
              const game = beginGame(deal, current.members);
              forgetResult(code);
              await persistGame(client, code, game);
            }
          }
        } else if (pathname.endsWith("/wolf-chat")) {
          const game = room.rows[0].role_state;
          if (advanceGame(game)) await persistGame(client, code, game);
          sendWolfChat(game, user.id, body);
        } else if (pathname.endsWith("/act")) {
          const game = room.rows[0].role_state;
          advanceGame(game);
          act(game, user.id, body);
          await persistGame(client, code, game);
        } else if (pathname.endsWith("/ready")) {
          if (room.rows[0].role_state) throw fault(409, "Phòng đã chia vai.");
          if (typeof body.ready !== "boolean") throw fault(400, "Trạng thái sẵn sàng không hợp lệ.");
          await client.query("UPDATE ww_room_members SET ready=$1 WHERE user_id=$2", [body.ready, user.id]);
        } else {
          if (room.rows[0].role_state) {
            const game = room.rows[0].role_state;
            advanceGame(game);
            leaveGame(game, user.id);
            await persistGame(client, code, game);
          }
          await client.query("DELETE FROM ww_room_members WHERE user_id=$1", [user.id]);
          const remaining = await client.query("SELECT user_id FROM ww_room_members WHERE room_code=$1 ORDER BY joined_at,user_id LIMIT 1", [code]);
          if (!remaining.rows.length) {
            await client.query("DELETE FROM ww_rooms WHERE code=$1", [code]);
            forgetResult(code);
          }
          else if (room.rows[0].host_id === user.id) await client.query("UPDATE ww_rooms SET host_id=$1 WHERE code=$2", [remaining.rows[0].user_id, code]);
        }
      }
      const room = await currentRoom(client, user.id);
      await client.query("COMMIT");
      return json(response, 200, { room }, request, { ETag: roomTag(room) });
    } catch (error) {
      if (client) await client.query("ROLLBACK").catch(() => {});
      return json(response, error.status || 503, { error: error.status ? error.message : "Không thể cập nhật phòng. Vui lòng thử lại." });
    } finally { client?.release(); }
  };
}
