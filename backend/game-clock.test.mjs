import test from "node:test";
import assert from "node:assert/strict";
import { createClockTick } from "./game-clock.mjs";
import { trackedRooms } from "./room-cleanup.mjs";
import { activeRooms } from "./game-storage.mjs";

test("Clock stops querying an empty database and resumes room cleanup when needed", async () => {
  trackedRooms.clear(); activeRooms.clear();
  const queries = [];
  const pool = { query: async sql => { queries.push(sql); return { rows: [] }; } };
  const tick = createClockTick(pool);
  await tick();
  assert.equal(queries.length, 1);
  for (let i=0; i<100; i++) await tick();
  assert.equal(queries.length, 1, "Idle ticks must not keep Neon awake");
  trackedRooms.add("ABC123");
  await tick();
  assert.equal(queries.length, 4);
  assert.equal(trackedRooms.size, 0);
  await tick();
  assert.equal(queries.length, 4);
});
