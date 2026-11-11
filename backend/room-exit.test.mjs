import test from 'node:test';
import assert from 'node:assert/strict';
import { installRoomExit } from '../js/room-exit.js';

test('Closing starts leaving before unload, uses the latest room, and avoids duplicate pagehide sends', async () => {
  const events = new EventTarget(), calls = [];
  let room = null;
  installRoomExit(() => room, { events, beacon: (url, body) => { calls.push({ url, body }); return true; }, request: () => { throw Error('Unexpected fallback'); } });
  events.dispatchEvent(new Event('beforeunload'));
  assert.equal(calls.length, 0);
  room = { code: 'ABC123' };
  events.dispatchEvent(new Event('beforeunload'));
  events.dispatchEvent(new Event('pagehide'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/rooms/disconnect');
  assert.equal(calls[0].body.type, 'application/json');
  assert.deepEqual(JSON.parse(await calls[0].body.text()), { roomCode: 'ABC123', pageExit: true });
  events.dispatchEvent(new Event('pageshow'));
  room = { code: 'DEF456' };
  events.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(JSON.parse(await calls[1].body.text()), { roomCode: 'DEF456', pageExit: true });
});

test('Rejected or throwing beacons fall back to authenticated keepalive requests', async () => {
  for (const beacon of [() => false, () => { throw Error('Rejected'); }]) {
    const events = new EventTarget(), requests = [];
    installRoomExit(() => ({ code: 'ABC123' }), { events, beacon, request: async (url, options) => { requests.push({ url, options }); return { ok: true }; } });
    events.dispatchEvent(new Event('beforeunload'));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, '/api/rooms/disconnect');
    assert.equal(requests[0].options.keepalive, true);
    assert.equal(requests[0].options.credentials, 'same-origin');
    assert.deepEqual(JSON.parse(requests[0].options.body), { roomCode: 'ABC123', pageExit: true });
  }
});
