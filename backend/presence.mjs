import { advanceGame, leaveGame } from './game.mjs';
import { persistGame, forgetResult } from './game-storage.mjs';
import { settleReplay } from './replay.mjs';

// A short grace period preserves reloads; the longer lease covers crashes/lost networks.
export async function pruneDisconnectedMembers(pool) {
  const stale = await pool.query("SELECT DISTINCT room_code FROM ww_room_members WHERE exit_requested_at < NOW()-INTERVAL '10 seconds' OR last_seen_at < NOW()-INTERVAL '2 minutes'");
  for (const { room_code: code } of stale.rows) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT host_id,role_state FROM ww_rooms WHERE code=$1 FOR UPDATE', [code]);
      const room = result.rows[0];
      if (!room) { await client.query('COMMIT'); continue; }
      const removed = await client.query("DELETE FROM ww_room_members WHERE room_code=$1 AND (exit_requested_at < NOW()-INTERVAL '10 seconds' OR last_seen_at < NOW()-INTERVAL '2 minutes') RETURNING user_id", [code]);
      if (!removed.rows.length) { await client.query('COMMIT'); continue; }
      const game = room.role_state;
      if (game) {
        advanceGame(game);
        for (const { user_id: id } of removed.rows) {
          leaveGame(game, id);
          if (game.replayVote?.status === 'open') {
            game.replayVote.voters = game.replayVote.voters.filter(voter => voter !== id);
            delete game.replayVote.votes[id];
          }
        }
        if (game.phase !== 'ended' && settleReplay(game)) {
          await client.query('UPDATE ww_rooms SET role_state=NULL WHERE code=$1', [code]);
          forgetResult(code);
        } else await persistGame(client, code, game);
      }
      const remaining = await client.query('SELECT user_id FROM ww_room_members WHERE room_code=$1 ORDER BY joined_at,user_id LIMIT 1', [code]);
      if (!remaining.rows.length) {
        await client.query('DELETE FROM ww_rooms WHERE code=$1', [code]);
        forgetResult(code);
      } else if (removed.rows.some(member => member.user_id === room.host_id)) {
        await client.query('UPDATE ww_rooms SET host_id=$1 WHERE code=$2', [remaining.rows[0].user_id, code]);
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { client.release(); }
  }
}
