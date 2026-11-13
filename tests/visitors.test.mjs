// Checks the museum's other visitors (src/museum/visitors.js) on a small museum of three rooms: where people can
// walk, the class walking from work to work, and how they keep out of your way. Run with: npm test
// (tests/e2e/visitors.py checks them in the real museum, in a browser.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeGrid, createVisitors, toSegment, CLASS } from '../src/museum/visitors.js';

const seeded = (n) => () => { n = (n * 16807) % 2147483647; return (n - 1) / 2147483646; };

// Rooms A (x 0 to 10) and B (10 to 20) people may visit, and C (20 to 30), a game room they may not. Each is
// 8 m deep (z 0 to 8), with a 2 m doorway between A and B and between B and C, a bench in A and a story stand in B.
const ROOMS = [{ id: 'A', x0: 0, x1: 10 }, { id: 'B', x0: 10, x1: 20 }, { id: 'C', x0: 20, x1: 30, game: true }];
const roomAt = (x, z) => (z < 0 || z > 8 ? null : ROOMS.find((r) => x >= r.x0 && x < r.x1) || null);
const W = 0.2;
const COLLIDERS = [
  { x0: 0, x1: 30, z0: -W, z1: 0 }, { x0: 0, x1: 30, z0: 8, z1: 8 + W },              // north and south walls
  { x0: -W, x1: 0, z0: 0, z1: 8 }, { x0: 30, x1: 30 + W, z0: 0, z1: 8 },              // west and east walls
  { x0: 10 - W / 2, x1: 10 + W / 2, z0: 0, z1: 3 }, { x0: 10 - W / 2, x1: 10 + W / 2, z0: 5, z1: 8 }, // A|B, doorway z 3 to 5
  { x0: 20 - W / 2, x1: 20 + W / 2, z0: 0, z1: 3 }, { x0: 20 - W / 2, x1: 20 + W / 2, z0: 5, z1: 8 }, // B|C, doorway z 3 to 5
  { x0: 4, x1: 6, z0: 3.7, z1: 4.3 },                                                    // a bench in the middle of A
  { x0: 14.65, x1: 15.35, z0: 3.65, z1: 4.35 },                                           // a story stand in B
];
// works on the walls (read from 1.6 m out) and the story stand (read from its south side)
const WORKS = [
  { id: 'a1', center: { x: 3, z: 0.2 }, spot: { x: 3, z: 1.8 } }, { id: 'a2', center: { x: 7, z: 0.2 }, spot: { x: 7, z: 1.8 } },
  { id: 'a3', center: { x: 5, z: 7.8 }, spot: { x: 5, z: 6.2 } }, { id: 'b1', center: { x: 13, z: 0.2 }, spot: { x: 13, z: 1.8 } },
  { id: 'b2', center: { x: 17, z: 7.8 }, spot: { x: 17, z: 6.2 } }, { id: 'b3', center: { x: 15, z: 4 }, spot: { x: 15, z: 4.95 } },
];
const plan = () => makeGrid({ x0: -1, z0: -1, x1: 31, z1: 9, colliders: COLLIDERS, walkable: (x, z) => { const r = roomAt(x, z); return !!r && !r.game; } });
const inside = (p, pad) => COLLIDERS.find((b) => p.x > b.x0 - pad && p.x < b.x1 + pad && p.z > b.z0 - pad && p.z < b.z1 + pad);

// a way stays clear of every wall and piece of furniture, by a little less than a body's width
function assertClear(way, from, what) {
  let a = from;
  for (const b of way) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05));
    for (let k = 0; k <= n; k++) {
      const p = { x: a.x + (b.x - a.x) * (k / n), z: a.z + (b.z - a.z) * (k / n) };
      const hit = inside(p, 0.15);
      assert.ok(!hit, `${what}: the way passes through a box at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
    }
    a = b;
  }
}

test('the grid: open floor, closed walls and furniture, and no way into the game room', () => {
  const g = plan();
  assert.ok(g.isOpen(2, 6), 'open floor in A');
  assert.ok(!g.isOpen(5, 4), 'the bench');
  assert.ok(!g.isOpen(10, 1), 'the wall between A and B');
  assert.ok(g.isOpen(10, 4), 'the doorway');
  assert.ok(!g.isOpen(25, 4), 'the game room is closed to them');
  const way = g.path({ x: 2, z: 6 }, { x: 18, z: 1.5 });
  assert.ok(way, 'from A to B');
  assertClear(way, { x: 2, z: 6 }, 'A to B');
  // it crosses x = 10 through the doorway
  let a = { x: 2, z: 6 };
  for (const b of way) {
    if ((a.x - 10) * (b.x - 10) < 0) { const z = a.z + (b.z - a.z) * ((10 - a.x) / (b.x - a.x)); assert.ok(z > 3.2 && z < 4.8, 'through the doorway, at z = ' + z.toFixed(2)); }
    a = b;
  }
  const inC = g.path({ x: 2, z: 6 }, { x: 25, z: 4 });
  assert.ok(!inC || inC.every((p) => !roomAt(p.x, p.z) || !roomAt(p.x, p.z).game), 'nobody is sent into the game room');
});

test('the way goes round someone standing in it', () => {
  const g = plan();
  const person = { x: 2, z: 4 };
  const way = g.path({ x: 2, z: 6.5 }, { x: 2, z: 1.5 }, (x, z) => Math.hypot(x - person.x, z - person.z) < 1.0);
  assert.ok(way);
  let a = { x: 2, z: 6.5 };
  for (const b of way) { assert.ok(toSegment(person, a, b).d > 0.9, 'it keeps clear of them'); a = b; }
});

test('the class walks from work to work and looks, never into a wall, furniture or the game room', () => {
  const g = plan();
  const v = createVisitors({ grid: g, works: WORKS, starts: ['a1', 'b1', 'b2'], rnd: seeded(3) });
  assert.equal(v.people.length, CLASS.flat().length);
  assert.equal(v.people.filter((p) => p.adult).length, 1, 'one teacher');
  const me = { x: 1, z: 7.2 }; // you, standing in a corner
  const seen = new Set(), acts = new Set();
  for (let t = 0; t < 300; t += 0.1) {
    v.update(0.1, me, null, []);
    for (const p of v.people) {
      acts.add(p.act);
      const r = roomAt(p.x, p.z);
      assert.ok(r && !r.game, `${p.id} stays in the rooms they may visit (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
      assert.ok(!inside(p, 0.05), `${p.id} is never inside a wall or furniture`);
      if (p.act === 'look') WORKS.forEach((w) => { if (Math.hypot(w.spot.x - p.x, w.spot.z - p.z) < 1.2) seen.add(w.id); });
      if (p.act !== 'walk') assert.ok(Math.hypot(p.x - me.x, p.z - me.z) > 0.6, `${p.id} does not stand right against you`);
    }
  }
  assert.ok(seen.size >= 5, 'in five minutes they look at most of the works: ' + [...seen].join(', '));
  for (const a of ['walk', 'look', 'talk', 'point']) assert.ok(acts.has(a), 'they ' + a);
});

test('when you stop at a work, they move on and nobody stands between you and it', () => {
  const g = plan();
  const v = createVisitors({ grid: g, works: WORKS, starts: ['a2', 'b1', 'b2'], rnd: seeded(5) });
  const w = WORKS.find((x) => x.id === 'a2');
  const me = { x: w.spot.x + 0.3, z: w.spot.z + 0.3 }; // you come to the work the first group is looking at
  for (let t = 0; t < 6; t += 0.1) v.update(0.1, me, 'a2', []);
  const d = v.debug();
  assert.notEqual(d.groups[0].target, 'a2', 'the group left the work for you');
  for (let t = 0; t < 30; t += 0.1) {
    v.update(0.1, me, 'a2', []);
    for (const p of v.people) {
      if (p.act === 'walk') continue;
      const s = toSegment(p, me, w.center);
      assert.ok(!(s.d < 0.4 && s.t > 0.1 && s.t < 0.9), `${p.id} does not stand between you and the work`);
      assert.ok(Math.hypot(p.x - me.x, p.z - me.z) > 0.6, `${p.id} does not crowd you`);
    }
  }
});

test('when you step right onto where one of them stands, they make way and do not stay stuck beside you', () => {
  const w = WORKS.find((x) => x.id === 'a2');
  for (let who = 0; who < 3; who++) {
    const v = createVisitors({ grid: plan(), works: WORKS, starts: ['a2', 'b1', 'b2'], rnd: seeded(5 + who) });
    const q = v.people[who]; // the teacher, then each pupil of the first group, standing at a2
    const me = { x: q.x, z: q.z };
    for (let t = 0; t < 8; t += 0.1) v.update(0.1, me, 'a2', []);
    for (let t = 0; t < 30; t += 0.1) {
      v.update(0.1, me, 'a2', []);
      for (const p of v.people) {
        if (p.act === 'walk') continue;
        assert.ok(Math.hypot(p.x - me.x, p.z - me.z) > 0.6, `standing where ${q.id} stood: ${p.id} is not left ${p.act === 'look' ? 'looking' : 'standing'} right against you`);
        const s = toSegment(p, me, w.center);
        assert.ok(!(s.d < 0.4 && s.t > 0.1 && s.t < 0.9), `standing where ${q.id} stood: ${p.id} is not between you and the work`);
      }
    }
  }
});

test('a group can start out walking to its first work', () => {
  const g = plan();
  const v = createVisitors({ grid: g, works: WORKS, starts: [{ work: 'b2', x: 3, z: 5 }, 'a1', 'b1'], rnd: seeded(4) });
  const first = v.people.slice(0, 3);
  first.forEach((p) => assert.ok(Math.hypot(p.x - 3, p.z - 5) < 2.2 && g.isOpen(p.x, p.z), p.id + ' starts near (3, 5), on open floor'));
  const spot = WORKS.find((w) => w.id === 'b2').spot;
  let reached = false;
  for (let t = 0; t < 40 && !reached; t += 0.1) {
    v.update(0.1, { x: 1, z: 7.2 }, null, []);
    reached = Math.hypot(first[0].x - spot.x, first[0].z - spot.z) < 0.3;
  }
  assert.ok(reached, 'the first of them gets to b2');
});

test('someone standing in their way: they wait, then go round, and still get there', () => {
  const g = plan();
  const v = createVisitors({ grid: g, works: WORKS, starts: ['a1', 'b1', 'b2'], rnd: seeded(7) });
  // you stand in the doorway between A and B, where people pass
  const me = { x: 10, z: 4 };
  let blockedThenMoved = false;
  const where = new Map();
  for (let t = 0; t < 240; t += 0.1) {
    v.update(0.1, me, null, []);
    for (const p of v.people) {
      const last = where.get(p.id);
      if (last && Math.hypot(p.x - last.x, p.z - last.z) > 1e-6 && Math.abs(p.x - 10) < 3) blockedThenMoved = true;
      where.set(p.id, { x: p.x, z: p.z });
      assert.ok(Math.hypot(p.x - me.x, p.z - me.z) > 0.5, `${p.id} never walks into you`);
    }
  }
  assert.ok(blockedThenMoved, 'people still pass near the doorway, round you');
  const seen = new Set(v.debug().groups.map((gr) => gr.target));
  assert.ok(seen.size >= 2, 'the groups still go on to other works');
});

test('they do not walk into each other when they stop', () => {
  const g = plan();
  const v = createVisitors({ grid: g, works: WORKS, starts: ['a1', 'b1', 'b2'], rnd: seeded(11) });
  const me = { x: 10, z: 4 }; // you, in the doorway everyone passes through
  let closest = Infinity;
  for (let t = 0; t < 240; t += 0.1) {
    v.update(0.1, me, null, []);
    const ps = v.people;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      if (ps[i].act === 'walk' && ps[j].act === 'walk') continue; // passing each other is all right
      closest = Math.min(closest, Math.hypot(ps[i].x - ps[j].x, ps[i].z - ps[j].z));
    }
  }
  assert.ok(closest > 0.3, 'nobody stands inside someone else (closest: ' + closest.toFixed(2) + ' m)');
});

test('wherever you go and stop, nobody gets stuck, crowds you, blocks your view or ends up in a wall', () => {
  const g = plan();
  for (let run = 0; run < 12; run++) {
    const rnd = seeded(1000 + run * 7);
    const v = createVisitors({ grid: g, works: WORKS, starts: ['a1', 'b1', 'b2'], rnd: seeded(run + 1) });
    let me = { x: 2, z: 7 }, near = null, since = 0;
    const moved = new Map(v.people.map((p) => [p.id, { x: p.x, z: p.z, t: 0 }]));
    for (let t = 0; t < 300; t += 0.1) {
      // every 25 s you go somewhere else: to a work (most often one a group is looking at), onto someone, or anywhere
      if (t % 25 < 0.1) {
        const r = rnd();
        near = null;
        if (r < 0.5) {
          const busy = v.debug().groups.filter((x) => x.looking).map((x) => x.target);
          near = busy.length && rnd() < 0.7 ? busy[Math.floor(rnd() * busy.length)] : WORKS[Math.floor(rnd() * WORKS.length)].id;
          const w = WORKS.find((x) => x.id === near); me = { x: w.spot.x, z: w.spot.z };
        } else if (r < 0.75) {
          const q = v.people[Math.floor(rnd() * v.people.length)]; me = { x: q.x, z: q.z };
        } else {
          let q; do { q = { x: 0.3 + rnd() * 19.4, z: 0.3 + rnd() * 7.4 }; } while (!g.isOpen(q.x, q.z));
          me = q;
        }
        since = 0;
      }
      since += 0.1;
      v.update(0.1, me, near, []);
      const at = `run ${run}, ${t.toFixed(1)} s`;
      for (const p of v.people) {
        assert.ok(!inside(p, 0.05), `${at}: ${p.id} is not inside a wall or furniture`);
        const r = roomAt(p.x, p.z);
        assert.ok(r && !r.game, `${at}: ${p.id} stays in the rooms they may visit`);
        if (since > 5 && p.act !== 'walk') {
          assert.ok(Math.hypot(p.x - me.x, p.z - me.z) > 0.6, `${at}: ${p.id} does not stand right against you`);
          if (near) {
            const s = toSegment(p, me, WORKS.find((x) => x.id === near).center);
            assert.ok(!(s.d < 0.4 && s.t > 0.1 && s.t < 0.9), `${at}: ${p.id} does not stand between you and ${near}`);
          }
        }
        const last = moved.get(p.id);
        if (Math.hypot(p.x - last.x, p.z - last.z) > 0.5) moved.set(p.id, { x: p.x, z: p.z, t });
        assert.ok(t - last.t < 45, `${at}: ${p.id} is not stuck in one place (${p.act})`);
      }
    }
  }
});

test('they keep clear of Bayani', () => {
  const g = plan();
  const v = createVisitors({ grid: g, works: WORKS, starts: ['a1', 'a2', 'b1'], rnd: seeded(9) });
  const me = { x: 1, z: 7.2 };
  const bayani = { x: 3.4, z: 1.9 }; // where the first group is looking
  for (let t = 0; t < 4; t += 0.1) v.update(0.1, me, null, [bayani]);
  for (let t = 0; t < 20; t += 0.1) {
    v.update(0.1, me, null, [bayani]);
    for (const p of v.people) if (p.act !== 'walk') assert.ok(Math.hypot(p.x - bayani.x, p.z - bayani.z) > 0.6, `${p.id} stays clear of Bayani`);
  }
});
