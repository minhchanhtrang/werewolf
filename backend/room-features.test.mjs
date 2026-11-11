import test from 'node:test';
import assert from 'node:assert/strict';
import { appendLobbyMessage } from './lobby-chat.mjs';
import { beginGame, act, gameView, leaveGame } from './game.mjs';
import { canStartRoom } from '../js/rules.js';
import { pruneDisconnectedMembers } from './presence.mjs';

test('Lobby chat validates, limits history and throttles each sender separately', () => {
  const user = { id: 1, username: 'Alice' };
  let messages = appendLobbyMessage([], user, ' hello ', 1000);
  assert.equal(messages[0].text, 'hello');
  assert.throws(() => appendLobbyMessage(messages, user, 'spam', 1100), { status: 429 });
  assert.equal(appendLobbyMessage(messages, { id: 2, username: 'Bob' }, 'hi', 1100).length, 2);
  for (const bad of ['', ' '.repeat(5), 'x'.repeat(301), '\u0000', null]) {
    assert.throws(() => appendLobbyMessage([], user, bad), { status: 400 });
  }
  for (let i = 1; i < 70; i++) messages = appendLobbyMessage(messages, user, 'message ' + i, 1000 + i * 600);
  assert.equal(messages.length, 50);
  assert.equal(messages.at(-1).text, 'message 69');
});

test('Voting exposes target totals without exposing voter identities and updates changed/removed votes', () => {
  const roles = ['wolf', 'wolf', 'seer', 'witch', 'villager', 'villager'];
  const members = roles.map((role, i) => ({ id: i + 1, username: 'P' + (i + 1), ready: false }));
  assert.equal(canStartRoom(members, 20), true);
  assert.equal(canStartRoom(members.slice(0, 4), 20), false);
  const game = beginGame({ players: roles.map((role, i) => ({ id: i + 1, role })) }, members);
  game.phase = 'voting'; game.deadline = Date.now() + 120000;
  const vote = (id, targetId, kind) => act(game, id, { phaseId: game.phaseId, targetId, kind });
  vote(1, 3); vote(2, 3); vote(4, null, 'blank');
  assert.deepEqual(gameView(game, 5).voteTally, { 3: 2 });
  assert.equal(gameView(game, 5).voteCount, 3);
  assert.equal(Object.hasOwn(gameView(game, 5), 'votes'), false);
  vote(2, 4);
  assert.deepEqual(gameView(game, 5).voteTally, { 3: 1, 4: 1 });
  leaveGame(game, 2);
  assert.deepEqual(gameView(game, 5).voteTally, { 3: 1 });
  game.phase = 'night';
  assert.deepEqual(gameView(game, 5).voteTally, {});
});

test('Disconnected host is removed under room lock and ownership transfers to next member', async () => {
  const statements = [];
  const client = {
    async query(sql) {
      statements.push(sql);
      if (sql.startsWith('SELECT host_id')) return { rows: [{ host_id: 1, role_state: null }] };
      if (sql.startsWith('DELETE FROM ww_room_members')) return { rows: [{ user_id: 1 }] };
      if (sql.startsWith('SELECT user_id')) return { rows: [{ user_id: 2 }] };
      return { rows: [] };
    },
    release() { statements.push('released'); }
  };
  await pruneDisconnectedMembers({ query: async () => ({ rows: [{ room_code: 'ABC123' }] }), connect: async () => client });
  assert.ok(statements.some(sql => sql.includes('FOR UPDATE')));
  assert.ok(statements.some(sql => sql.includes("last_seen_at < NOW()-INTERVAL '2 minutes'")));
  assert.ok(statements.includes('UPDATE ww_rooms SET host_id=$1 WHERE code=$2'));
  assert.equal(statements.at(-2), 'COMMIT');
  assert.equal(statements.at(-1), 'released');
});
