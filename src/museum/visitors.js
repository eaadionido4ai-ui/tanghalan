// The museum's other visitors: a class on a field trip, with their teacher, in three small groups.
//
// Each group walks from work to work through the doorways, the teacher in front, stops at one for a while and looks
// at it: the teacher explains, a child points. They keep out of your way: if you are on their path they wait, then go
// round you (after a long wait in a doorway, they squeeze past); if you come close, they step aside; when you stop at
// the work they are looking at, or are going to, they go to another, and nobody stands between you and it. They keep
// clear of Bayani too, and of each other: they go round someone standing still, and two who come too close drift
// apart. They never go into the two game rooms, so your games stay yours. Now and then a child waves at you.
//
// This file only moves them on the floor (it knows nothing of three.js), so it can be checked on its own:
// tests/visitors.test.mjs. runtime.js gives it the museum's plan and draws the people (people.js).
// Positions are in metres on the floor: x to the east, z to the south. A heading (yaw) is the way someone faces,
// as the player's: 0 faces +z (south), PI / 2 faces +x (east).

export const CELL = 0.25;   // the walking grid's squares
export const BODY = 0.3;    // how far a person keeps from walls and furniture
export const SPACE = 0.8;   // how near you may come before someone steps aside
export const WAY = 0.85;    // how much room they want on their way
export const APART = 0.6;   // how far they keep from each other

// The class, in its three groups: who they are and how they look (people.js draws them from this).
const WHITE = 0xf4f1e8, NAVY = 0x26395c;
export const CLASS = [
  [
    { id: 'teacher', adult: true, look: { shirt: 0x2a8c8c, pants: 0x2f3540, hair: 0x2b1d16, bun: true, skin: 0xd69a63, lanyard: 0xc62f22 } },
    { id: 'visitor_1', look: { shirt: WHITE, pants: NAVY, hair: 0x1d1410, skin: 0xc68a55, bag: 0x2f74d0 } },
    { id: 'visitor_2', look: { shirt: WHITE, pants: NAVY, hair: 0x2b1d16, skin: 0xd69a63, bag: 0xf2b300, girl: 'long' } },
  ],
  [
    { id: 'visitor_3', look: { shirt: WHITE, pants: NAVY, hair: 0x3a2418, skin: 0xb87a48 } },
    { id: 'visitor_4', look: { shirt: WHITE, pants: NAVY, hair: 0x1d1410, skin: 0xe0aa78, bag: 0xe2588a, girl: 'pigtails' } },
  ],
  [
    { id: 'visitor_5', look: { shirt: WHITE, pants: NAVY, hair: 0x2b1d16, skin: 0xd69a63, bag: 0x4caf50 } },
    { id: 'visitor_6', look: { shirt: WHITE, pants: NAVY, hair: 0x4a2f20, skin: 0xc68a55, girl: 'long' } },
  ],
];

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const yawTo = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);

// how far p is from the segment a-b, and where along it (0 at a, 1 at b) it is nearest
export function toSegment(p, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz;
  const t = l2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / l2));
  return { d: Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t)), t };
}

// ---- where people can walk, and the way from one place to another ----

// The floor in squares of CELL. A square is open where its middle is walkable (inside a room people may go into)
// and a body's width clear of every box (colliders: { x0, x1, z0, z1 }). The way between two points is the
// shortest chain of open squares (A*), straightened wherever a straight line stays on open squares.
export function makeGrid({ x0, z0, x1, z1, colliders, walkable }) {
  const nx = Math.ceil((x1 - x0) / CELL), nz = Math.ceil((z1 - z0) / CELL), n = nx * nz;
  const open = new Uint8Array(n);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) open[j * nx + i] = walkable(x0 + (i + 0.5) * CELL, z0 + (j + 0.5) * CELL) ? 1 : 0;
  // each box closes the squares whose middles are within a body's width of it
  colliders.forEach((b) => {
    const i0 = Math.max(0, Math.floor((b.x0 - BODY - x0) / CELL - 0.5)), i1 = Math.min(nx - 1, Math.ceil((b.x1 + BODY - x0) / CELL - 0.5));
    const j0 = Math.max(0, Math.floor((b.z0 - BODY - z0) / CELL - 0.5)), j1 = Math.min(nz - 1, Math.ceil((b.z1 + BODY - z0) / CELL - 0.5));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = x0 + (i + 0.5) * CELL, z = z0 + (j + 0.5) * CELL;
      if (x >= b.x0 - BODY && x <= b.x1 + BODY && z >= b.z0 - BODY && z <= b.z1 + BODY) open[j * nx + i] = 0;
    }
  });
  const index = (x, z) => {
    const i = Math.floor((x - x0) / CELL), j = Math.floor((z - z0) / CELL);
    return i < 0 || j < 0 || i >= nx || j >= nz ? -1 : j * nx + i;
  };
  const middle = (c) => ({ x: x0 + ((c % nx) + 0.5) * CELL, z: z0 + (Math.floor(c / nx) + 0.5) * CELL });
  const isOpen = (x, z) => { const c = index(x, z); return c >= 0 && open[c] === 1; };

  function nearestCell(p, maxR, avoid) {
    const c0 = index(p.x, p.z);
    if (c0 >= 0 && open[c0] && !(avoid && avoid(p.x, p.z))) return c0;
    const i0 = Math.floor((p.x - x0) / CELL), j0 = Math.floor((p.z - z0) / CELL), rings = Math.ceil(maxR / CELL);
    let best = -1, bestD = Infinity;
    for (let r = 1; r <= rings && best < 0; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = i0 + di, j = j0 + dj;
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        const c = j * nx + i;
        if (!open[c]) continue;
        const m = middle(c);
        if (avoid && avoid(m.x, m.z)) continue;
        const d = dist(m, p);
        if (d < bestD && d <= maxR) { bestD = d; best = c; }
      }
    }
    return best;
  }

  // the nearest point to p where a person can stand (and avoid does not rule out), within maxR, or null
  function nearest(p, maxR = 2, avoid) {
    const c = nearestCell(p, maxR, avoid);
    if (c < 0) return null;
    return c === index(p.x, p.z) ? { x: p.x, z: p.z } : middle(c);
  }

  // whether the straight line from a to b stays on open squares (and clear of what avoid rules out)
  function clear(a, b, avoid) {
    const steps = Math.max(1, Math.ceil(dist(a, b) / (CELL * 0.4)));
    for (let k = 0; k <= steps; k++) {
      const t = k / steps, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      const c = index(x, z);
      if (c < 0 || !open[c] || (avoid && avoid(x, z))) return false;
    }
    return true;
  }

  // the search's working memory, kept from one search to the next (no garbage each time someone sets off)
  const g = new Float32Array(n), came = new Int32Array(n), touched = new Int32Array(n), closed = new Int32Array(n);
  let search = 0;
  const heapItems = [], heapKeys = [];
  const push = (item, key) => {
    heapItems.push(item); heapKeys.push(key);
    let k = heapItems.length - 1;
    while (k > 0) { const p = (k - 1) >> 1; if (heapKeys[p] <= heapKeys[k]) break; swap(k, p); k = p; }
  };
  const pop = () => {
    const top = heapItems[0], last = heapItems.length - 1;
    heapItems[0] = heapItems[last]; heapKeys[0] = heapKeys[last]; heapItems.pop(); heapKeys.pop();
    let k = 0;
    for (;;) {
      const l = 2 * k + 1, r = l + 1; let m = k;
      if (l < heapItems.length && heapKeys[l] < heapKeys[m]) m = l;
      if (r < heapItems.length && heapKeys[r] < heapKeys[m]) m = r;
      if (m === k) break; swap(k, m); k = m;
    }
    return top;
  };
  const swap = (a, b) => { const t = heapItems[a]; heapItems[a] = heapItems[b]; heapItems[b] = t; const u = heapKeys[a]; heapKeys[a] = heapKeys[b]; heapKeys[b] = u; };
  const touch = (c) => { if (touched[c] !== search) { touched[c] = search; g[c] = Infinity; came[c] = -1; } };
  const h = (a, b) => { const dx = Math.abs((a % nx) - (b % nx)), dz = Math.abs(Math.floor(a / nx) - Math.floor(b / nx)); return Math.max(dx, dz) + 0.41421356 * Math.min(dx, dz); };

  function astar(s, goal, avoid) {
    if (s === goal) return [s, goal];
    search++; heapItems.length = 0; heapKeys.length = 0;
    touch(s); g[s] = 0; push(s, h(s, goal));
    while (heapItems.length) {
      const c = pop();
      if (c === goal) break;
      if (closed[c] === search) continue;
      closed[c] = search;
      const ci = c % nx, cj = Math.floor(c / nx);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= nx || j >= nz) continue;
        const e = j * nx + i;
        if (!open[e] || closed[e] === search) continue;
        if (di && dj && (!open[cj * nx + i] || !open[j * nx + ci])) continue; // no cutting a corner past a wall
        if (avoid && e !== goal) { const m = middle(e); if (avoid(m.x, m.z)) continue; }
        const t = g[c] + (di && dj ? 1.41421356 : 1);
        touch(e);
        if (t < g[e]) { g[e] = t; came[e] = c; push(e, t + h(e, goal)); }
      }
    }
    if (touched[goal] !== search || came[goal] < 0) return null;
    const cells = [];
    for (let c = goal; c >= 0; c = came[c]) { cells.push(c); if (c === s) break; }
    return cells.reverse();
  }

  // the way from one point to another: the points to walk to, in order, ending at the goal (or, if the goal is
  // not open, at the nearest open point); null if there is no way
  function path(from, to, avoid) {
    const s = nearestCell(from, 2, null), goal = nearestCell(to, 2, avoid);
    if (s < 0 || goal < 0) return null;
    const cells = astar(s, goal, avoid);
    if (!cells) return null;
    const raw = [from];
    for (let k = 1; k < cells.length - 1; k++) raw.push(middle(cells[k]));
    raw.push(index(to.x, to.z) === goal ? to : middle(goal));
    // straighten: from each point, on to the farthest one in plain view
    const out = [];
    let at = 0;
    while (at < raw.length - 1) {
      let far = at + 1;
      for (let m = at + 2; m < raw.length; m++) {
        if (clear(raw[at], raw[m], avoid)) far = m;
        else if (m > far + 6) break;
      }
      out.push(raw[far]); at = far;
    }
    return out;
  }

  return { isOpen, nearest, clear, path, nx, nz };
}

// ---- the class ----

// opts.grid: from makeGrid. opts.works: the works they may look at, [{ id, spot: {x, z}, center: {x, z} }] (spot:
// where a reader stands). opts.starts: for each group, the work it starts at, or { work, x, z } for a group that
// starts out walking to it from (x, z). opts.rnd: random numbers, 0..1.
export function createVisitors({ grid, works, starts, rnd = Math.random }) {
  const people = [];
  const groups = [];
  const members = [];
  const byId = new Map(works.map((w) => [w.id, w]));

  CLASS.forEach((list, gi) => {
    const group = { m: [], target: null, looking: false, left: 0, time: 0, walked: 0, explained: false, pointed: false, seen: [] };
    groups.push(group);
    list.forEach((who, k) => {
      const p = { id: who.id, adult: !!who.adult, look: who.look, x: 0, z: 0, yaw: 0, act: 'look' };
      const m = { p, g: group, k, speed: who.adult ? 0.9 : 0.95 + 0.2 * rnd(), state: 'looking', spot: null, spotYaw: 0,
        delay: 0, pending: false, way: null, next: 0, t: 0, by: null, waited: 0, squeeze: 0, reroute: 0, offWay: false,
        gesture: null, gestureLeft: 0, waveAgain: 0, asideAgain: 0 };
      group.m.push(m); members.push(m); people.push(p);
    });
    const start = starts && starts[gi];
    const first = byId.get(start && start.work ? start.work : start) || works[(gi * 5) % works.length];
    aim(group, first);
    if (start && start.x != null) {
      // on their way to it, one behind the other
      group.m.forEach((m, k) => {
        const at = grid.nearest({ x: start.x + (k % 2 ? 0.55 : 0) - (k > 1 ? 0.55 : 0), z: start.z + k * 0.7 }, 1.5) || { x: start.x, z: start.z };
        m.p.x = at.x; m.p.z = at.z; m.p.yaw = yawTo(at, first.center); m.p.act = 'walk';
      });
    } else {
      // already looking at it
      group.m.forEach((m) => { m.p.x = m.spot.x; m.p.z = m.spot.z; m.p.yaw = m.spotYaw; m.state = 'looking'; m.pending = false; m.delay = 0; });
      group.looking = true; group.left = 3 + 7 * rnd();
    }
  });

  // the group's places in front of a work: the first where a reader stands, the others beside and a little behind
  function aim(group, w) {
    group.target = w; group.looking = false; group.explained = group.pointed = false; group.time = 0; group.walked = 0;
    group.seen.push(w.id); if (group.seen.length > 6) group.seen.shift();
    const d = dist(w.spot, w.center) || 1, nx = (w.spot.x - w.center.x) / d, nz = (w.spot.z - w.center.z) / d; // away from the work
    const tx = -nz, tz = nx; // along it
    group.m.forEach((m, k) => {
      const side = k === 0 ? 0 : k % 2 ? 0.75 : -0.75, back = k === 0 ? 0 : 0.25;
      const want = { x: w.spot.x + tx * side + nx * back, z: w.spot.z + tz * side + nz * back };
      m.spot = grid.nearest(want, 1.2) || want;
      m.spotYaw = yawTo(m.spot, w.center);
      m.delay = k * 0.45 + 0.3 * rnd(); m.pending = true;
      m.state = 'going'; m.t = 0;
    });
  }

  // the next work for a group: one they have not seen lately (or, when they have seen them all, any other one),
  // that no other group is at, that you are not at or near; nearer ones are likelier
  function choose(group, me, near) {
    const from = { x: group.m[0].p.x, z: group.m[0].p.z };
    for (const fresh of [true, false]) {
      const options = [], weights = [];
      let total = 0;
      works.forEach((w) => {
        if (w.id === near || w === group.target || (fresh && group.seen.indexOf(w.id) >= 0)) return;
        if (groups.some((o) => o !== group && o.target === w)) return;
        if (dist(w.spot, me) < 2.5) return;
        const wt = 1 / (1 + 0.15 * dist(w.spot, from));
        options.push(w); weights.push(wt); total += wt;
      });
      if (!options.length) continue;
      let r = rnd() * total;
      for (let k = 0; k < options.length; k++) { r -= weights[k]; if (r <= 0) return options[k]; }
      return options[options.length - 1];
    }
    return group.target;
  }

  // walking along the way (the pupils keep behind their teacher while she is still on her way: they do not pass her)
  function walk(m, dt) {
    const p = m.p, lead = m.g.m[0];
    let speed = m.speed;
    if (m !== lead && m.state === 'going' && lead.state !== 'looking' && dist(p, m.spot) < dist(lead.p, lead.spot) + 0.5) speed = Math.min(speed, lead.speed * 0.95);
    let go = speed * dt;
    if (m.offWay) {
      // pushed aside a little: if a wall's corner is now between them and the next point of their way, a new way
      m.offWay = false;
      const b = m.way && m.way[m.next];
      if (b && !grid.clear(p, b)) { const w = grid.path({ x: p.x, z: p.z }, m.spot); if (w) { m.way = w; m.next = 0; } }
    }
    while (go > 1e-9 && m.way && m.next < m.way.length) {
      const b = m.way[m.next], d = dist(p, b);
      if (d < 1e-6) { m.next++; continue; }
      p.yaw = yawTo(p, b);
      if (go >= d) { p.x = b.x; p.z = b.z; go -= d; m.next++; } else { p.x += (b.x - p.x) * (go / d); p.z += (b.z - p.z) * (go / d); go = 0; }
    }
    return !m.way || m.next >= m.way.length;
  }
  // the point d metres further along the way (or the end)
  function ahead(m, d) {
    let a = { x: m.p.x, z: m.p.z };
    if (!m.way) return a;
    for (let k = m.next; k < m.way.length; k++) {
      const b = m.way[k], l = dist(a, b);
      if (l >= d) return { x: a.x + (b.x - a.x) * (d / l), z: a.z + (b.z - a.z) * (d / l) };
      d -= l; a = b;
    }
    return a;
  }
  // you (or Bayani) are on the way just ahead of this person (beside or behind them is no reason to stop: that is
  // how they walk off when you come up to them)
  const inTheWay = (m, others) => {
    const a = { x: m.p.x, z: m.p.z }, b = ahead(m, 0.9);
    return others.some((o) => { const s = toSegment(o, a, b); return s.d < WAY && s.t > 0.05; });
  };
  // another visitor stands just ahead on the way (looking at a work, or waiting): wait, then go round them.
  // (Two of them walking past each other just pass: if each stopped for the other, both would keep stepping the
  // same way round and never get past.)
  const visitorAhead = (m) => {
    const a = { x: m.p.x, z: m.p.z }, b = ahead(m, 0.7);
    return people.some((o) => o !== m.p && o.act !== 'walk' && dist(a, o) < 1.0 && toSegment(o, a, b).d < APART && toSegment(o, a, b).t > 0.1);
  };

  // held up by someone standing on the way, close to their place (or beside a classmate already looking at the
  // work, who got there first and stands in the way), they look from where they are: not right against you, though
  const settleHere = (m, others) => {
    const p = m.p, d = dist(p, m.spot);
    if (others.some((o) => dist(p, o) < SPACE)) return false;
    return d < 1.2 || (d < 2.2 && m.g.m.some((o) => o !== m && o.state === 'looking' && dist(p, o.p) < 1.2));
  };
  function settle(m) {
    m.spot = { x: m.p.x, z: m.p.z }; m.spotYaw = yawTo(m.p, m.g.target.center); m.state = 'looking'; m.t = 0;
  }

  // a way on to their place that goes round you, Bayani and the others near them; if they are already too close to
  // one of them for that, it starts with a step back out of the way. tight: squeezing past (in a doorway, say)
  function wayRound(m, others, tight) {
    const p = m.p, from = { x: p.x, z: p.z }, room = tight ? 0.55 : WAY + 0.25;
    const near = people.filter((o) => o !== p && o.act !== 'walk' && dist(p, o) < 2.5);
    const avoid = (x, z) => others.some((o) => Math.hypot(x - o.x, z - o.z) < room) || near.some((o) => Math.hypot(x - o.x, z - o.z) < APART + 0.1);
    if (!avoid(from.x, from.z)) return grid.path(from, m.spot, avoid);
    const back = grid.nearest(from, 1.6, avoid);
    if (!back) return null;
    const first = grid.clear(from, back) ? [back] : grid.path(from, back), rest = grid.path(back, m.spot, avoid);
    return first && rest ? first.concat(rest) : null;
  }

  // a step aside: away from you, or sideways out of the line from you to the work you are at
  function stepAside(m, me, others, work) {
    m.asideAgain = 0.6; // if there is no room to step aside, try again a little later
    const p = { x: m.p.x, z: m.p.z };
    let dx, dz;
    if (!work) { dx = p.x - me.x; dz = p.z - me.z; } else {
      const vx = work.x - me.x, vz = work.z - me.z, s = (p.x - me.x) * -vz + (p.z - me.z) * vx >= 0 ? 1 : -1;
      dx = -vz * s; dz = vx * s;
    }
    if (Math.hypot(dx, dz) < 1e-6) { dx = 1; dz = 0; }
    const l = Math.hypot(dx, dz);
    const want = { x: p.x + dx / l, z: p.z + dz / l };
    const keepOff = (x, z) => others.some((o) => Math.hypot(x - o.x, z - o.z) < SPACE + 0.25) ||
      people.some((o) => o !== m.p && Math.hypot(x - o.x, z - o.z) < APART + 0.1) ||
      (work && toSegment({ x, z }, me, work).d < 0.6 && toSegment({ x, z }, me, work).t > 0.02 && toSegment({ x, z }, me, work).t < 0.98);
    const to = grid.nearest(want, 1.5, keepOff);
    if (!to) return;
    const way = grid.clear(p, to) ? [to] : grid.path(p, to);
    if (!way) return;
    m.way = way; m.next = 0;
    m.spot = to; m.spotYaw = yawTo(to, m.g.target.center);
    m.state = 'aside'; m.t = 0; m.delay = 0; m.pending = false;
  }

  // ---- each moment ----

  // me: where you are ({ x, z }); near: the id of the work you are at, or null; keep: other places to keep clear
  // of (where Bayani is), [{ x, z }]
  function update(dt, me, near, keep) {
    const others = [me].concat(keep || []);
    const nearWork = near ? byId.get(near) : null;
    groups.forEach((group) => {
      if (!group.looking) {
        // you have stopped at the work they are on their way to: they go to another
        if (near === group.target.id) { const w = choose(group, me, near); if (w !== group.target) aim(group, w); return; }
        // the look begins when the first of them stands at the work; the others join as they come. (If the first
        // of them is held up for long, it begins anyway once someone is there; if nobody gets there, they go on.)
        group.walked += dt;
        const there = group.m[0].state === 'looking' || (group.walked > 40 && group.m.some((m) => m.state === 'looking'));
        if (there) { group.looking = true; group.time = 0; group.left = 7 + 7 * rnd(); }
        else if (group.walked > 60) { const w = choose(group, me, near); if (w !== group.target) aim(group, w); else group.walked = 0; }
        return;
      }
      group.time += dt; group.left -= dt;
      // you have stopped at this work: it is yours, and they move on
      if (near === group.target.id && group.left > 1.2) group.left = 1.2;
      if (!group.explained && group.time > 0.8) {
        group.explained = true;
        group.m.forEach((m) => { if (m.p.adult && m.state === 'looking') { m.gesture = 'talk'; m.gestureLeft = 2.8; } });
      }
      if (!group.pointed && group.time > 3.5) {
        group.pointed = true;
        const kids = group.m.filter((m) => !m.p.adult && m.state === 'looking');
        if (kids.length) { const m = kids[Math.floor(rnd() * kids.length) % kids.length]; m.gesture = 'point'; m.gestureLeft = 1.8; }
      }
      if (group.left <= 0) aim(group, choose(group, me, near));
    });

    members.forEach((m) => {
      const p = m.p;
      m.t += dt;
      if (m.gestureLeft > 0) m.gestureLeft -= dt;
      if (m.waveAgain > 0) m.waveAgain -= dt;
      if (m.asideAgain > 0) m.asideAgain -= dt;
      if (m.squeeze > 0) m.squeeze -= dt;
      if (m.reroute > 0) m.reroute -= dt;
      switch (m.state) {
        case 'going':
        case 'aside': {
          if (m.delay > 0) { m.delay -= dt; p.act = 'stand'; break; }
          if (m.pending) {
            m.pending = false;
            m.way = grid.path({ x: p.x, z: p.z }, m.spot); m.next = 0;
            if (!m.way) { m.state = 'looking'; break; }
          }
          // (a step aside goes to a free place away from you, so only the way to a work can be blocked)
          if (m.state === 'going') {
            // you (or Bayani) are on the way: they stop (unless they are squeezing past you)
            if (m.squeeze <= 0 && inTheWay(m, others)) {
              m.state = 'blocked'; m.by = 'you'; m.t = 0; m.waited = 0;
              if (!p.adult && m.waveAgain <= 0 && rnd() < 0.6) { m.gesture = 'wave'; m.gestureLeft = 1.6; m.waveAgain = 25; }
              break;
            }
            // someone stands on the way: nearly there, they look from here; otherwise they go round
            if (m.reroute <= 0 && visitorAhead(m)) {
              if (settleHere(m, others)) { settle(m); break; }
              const around = wayRound(m, others);
              if (around) { m.way = around; m.next = 0; m.reroute = 1.5; }
              else { m.state = 'blocked'; m.by = 'visitor'; m.t = 0; m.waited = 0; p.act = 'stand'; break; }
            }
          }
          p.act = 'walk';
          if (walk(m, dt)) { m.state = 'looking'; m.t = 0; }
          break;
        }
        case 'blocked': {
          p.act = m.gestureLeft > 0 ? m.gesture : 'stand';
          if (m.by === 'you') p.yaw = yawTo(p, me);
          if (!inTheWay(m, others) && !visitorAhead(m)) { m.state = 'going'; break; }
          if (m.by === 'visitor' && settleHere(m, others)) { settle(m); break; }
          m.waited += dt;
          // right up against you, they go round (stepping back first) at once; otherwise after a moment. After a long
          // wait for you (in a doorway, say), or if there is no other way when you are that close, they squeeze past.
          const close = m.by === 'you' && others.some((o) => dist(p, o) < SPACE);
          if (close || m.t > (m.by === 'you' ? 2 : 1.2)) {
            let around = wayRound(m, others);
            if (!around && m.by === 'you' && (close || m.waited > 6)) { around = wayRound(m, others, true); if (around) m.squeeze = 4; }
            if (around) { m.way = around; m.next = 0; m.state = 'going'; m.reroute = 1.5; }
            m.t = 0;
          }
          break;
        }
        case 'looking': {
          p.act = m.gestureLeft > 0 ? m.gesture : 'look';
          p.yaw = m.spotYaw;
          if (m.asideAgain > 0) break;
          if (others.some((o) => dist(p, o) < SPACE)) { stepAside(m, me, others, null); break; }
          // nobody stands between you and the work you are at
          if (nearWork) {
            const s = toSegment(p, me, nearWork.center);
            if (s.d < 0.5 && s.t > 0.05 && s.t < 0.97) stepAside(m, me, others, nearWork.center);
          }
          break;
        }
        default: break;
      }
    });

    // nobody stands inside anyone else: two who come too close drift apart, a little at a time
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      const a = members[i], b = members[j], d = dist(a.p, b.p);
      if (d >= APART) continue;
      let ux = 1, uz = 0;
      if (d > 1e-6) { ux = (b.p.x - a.p.x) / d; uz = (b.p.z - a.p.z) / d; }
      const push = Math.min((APART - d) / 2, 0.5 * dt);
      nudge(a, -ux * push, -uz * push, others); nudge(b, ux * push, uz * push, others);
    }
  }
  // a little push: only onto open floor, and never towards you (or Bayani) when near. Someone walking who is pushed
  // off their way checks it is still clear before they go on (walk).
  function nudge(m, dx, dz, others) {
    const p = m.p, x = p.x + dx, z = p.z + dz;
    if (!grid.isOpen(x, z)) return;
    if (others.some((o) => Math.hypot(x - o.x, z - o.z) < Math.min(dist(p, o), 1.2))) return;
    p.x = x; p.z = z; m.offWay = true;
  }

  return {
    people,
    update,
    // for tests: what each group is doing
    debug() {
      return {
        people: members.map((m) => ({ id: m.p.id, x: m.p.x, z: m.p.z, yaw: m.p.yaw, act: m.p.act, adult: m.p.adult, state: m.state, by: m.state === 'blocked' ? m.by : null })),
        groups: groups.map((gr) => ({ target: gr.target && gr.target.id, looking: gr.looking, members: gr.m.map((m) => m.p.id) })),
      };
    },
  };
}
