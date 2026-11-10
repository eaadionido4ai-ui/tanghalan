// Runs TANGHALAN: renders the museum, walks the player with the joystick or keys, keeps the
// camera behind them and inside the walls, brings in Bayani the hologram guide when he is needed,
// and reports which room the player is in and what they are standing next to.
//
// The game rooms plug in here (opts.rooms): each is a function that gets a small kit (the scene, the
// player, ways to add things you can walk up to or tap, to steer the stick and the camera) and returns a
// controller with update(dt), which runs every frame while nothing covers the museum.

import { CEIL, SPAWN, room, roomAt } from './content.js';
import { buildWorld } from './world.js';
import { makeKid, makeHologram } from './characters.js';

const SPEED = 3.0;          // metres per second
const RADIUS = 0.3;         // how close the player can get to walls
const NEAR = 1.7;           // how close counts as "next to" a work
const TAP_REACH = 7;        // how far away a work can be tapped
const SHIRTS = { turtle: 0x2fa37a, eagle: 0xc8782a, dragon: 0x7a53c6, butterfly: 0xe2588a, whale: 0x2f74d0, frog: 0x4caf50, cat: 0xf2b300, fox: 0xf2760c };

export function createMuseum(canvas, opts) {
  const T = window.THREE;
  if (!T) throw new Error('three.js is not loaded');
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const camera = new T.PerspectiveCamera(60, 1, 0.05, 80);
  let ready = false;
  const world = buildWorld(T, renderer, (f) => opts.onProgress && opts.onProgress(f), () => { ready = true; opts.onReady && opts.onReady(); }, {});
  const { scene, colliders, items, ring, flicker } = world;

  const me = makeKid(T, { shirt: SHIRTS[opts.avatar] || 0xf2760c });
  const bayani = makeHologram(T);
  scene.add(me.group, bayani.group);

  const S = {
    x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, phase: 0, stride: 0,
    camYaw: SPAWN.yaw + Math.PI, camPitch: 0.36, camDist: 4.2, camShown: 4.2,
    move: { x: 0, y: 0 }, keys: new Set(), dragging: false, lastDrag: -10,
    paused: false, room: null, near: null, t: 0, speedK: 1,
    aim: null,      // when set, the stick and the keys steer this instead of walking: aim(x, y, dt)
    drag: null,     // when set, dragging the screen goes here instead of turning the camera: drag(dx, dy)
    cam: null,      // when set, the camera goes where this says: cam(S) -> { x, y, z, lx, ly, lz }
  };
  const clock = () => performance.now() / 1000; // real seconds
  // Bayani the hologram guide: on when he is here (or building up), k how much of him is there (0 gone .. 1 all
  // there), where he stands, the work he stands by (at), until when he has something to say, whether that is
  // new (fresh), and how long you have stood still
  const H = { on: false, k: 0, x: S.x, z: S.z, yaw: 0, at: null, until: 0, fresh: false, still: 0, last: 0 };

  const blocked = (x, z, r) => {
    for (let i = 0; i < colliders.length; i++) { const b = colliders[i]; if (x > b.x0 - r && x < b.x1 + r && z > b.z0 - r && z < b.z1 + r) return true; }
    return false;
  };
  const slide = (o, dx, dz, r) => { // move along x, then z, stopping at walls
    if (!blocked(o.x + dx, o.z, r)) o.x += dx;
    if (!blocked(o.x, o.z + dz, r)) o.z += dz;
  };
  // how far you can see from (x, z) along (dx, dz) before a wall, up to max
  const reach = (x, z, dx, dz, max) => {
    let best = max;
    for (let i = 0; i < colliders.length; i++) {
      const b = colliders[i], m = 0.18;
      if (b.low) continue; // tables and counters do not block the view
      let t0 = 0, t1 = best;
      if (Math.abs(dx) < 1e-6) { if (x < b.x0 - m || x > b.x1 + m) continue; } else {
        let a = (b.x0 - m - x) / dx, c = (b.x1 + m - x) / dx; if (a > c) { const s = a; a = c; c = s; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      }
      if (Math.abs(dz) < 1e-6) { if (z < b.z0 - m || z > b.z1 + m) continue; } else {
        let a = (b.z0 - m - z) / dz, c = (b.z1 + m - z) / dz; if (a > c) { const s = a; a = c; c = s; }
        t0 = Math.max(t0, a); t1 = Math.min(t1, c);
      }
      if (t0 <= t1 && t0 >= 0 && t0 < best) best = t0;
    }
    return best;
  };

  // ---- input: joystick (from the screen), keys, drag to look, pinch or wheel to zoom, tap to look ----
  const KEYS = { ArrowUp: [0, -1], KeyW: [0, -1], ArrowDown: [0, 1], KeyS: [0, 1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const onKey = (e) => {
    if (S.paused) return;
    if (e.target && e.target.closest && e.target.closest('input,textarea')) return;
    if (KEYS[e.code]) { if (e.type === 'keydown') S.keys.add(e.code); else S.keys.delete(e.code); e.preventDefault(); }
    else if (e.type === 'keydown' && !S.aim && (e.code === 'Enter' || e.code === 'Space') && S.near) { e.preventDefault(); opts.onOpen && opts.onOpen(S.near); }
  };
  const clearKeys = () => S.keys.clear();
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKey); window.addEventListener('blur', clearKeys);

  const pointers = new Map();
  let pinch = 0, downAt = null;
  const onDown = (e) => {
    if (S.paused) return;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) downAt = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); downAt = null; }
  };
  const onMove = (e) => {
    const p = pointers.get(e.pointerId); if (!p || S.paused) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pointers.size === 2) {
      if (S.drag) return;
      const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      S.camDist = Math.max(2.4, Math.min(6.5, S.camDist * (pinch / Math.max(d, 1)))); pinch = d; return;
    }
    if (downAt) downAt.moved += Math.abs(dx) + Math.abs(dy);
    if (S.drag) { S.drag(dx, dy); return; }
    S.camYaw -= dx * 0.0065; S.camPitch = Math.max(0.1, Math.min(0.9, S.camPitch + dy * 0.0045));
    S.dragging = true; S.lastDrag = S.t;
  };
  const onUp = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) S.dragging = false;
    if (downAt && downAt.moved < 10 && performance.now() - downAt.t < 450 && !S.paused) tap(e.clientX, e.clientY);
    downAt = null;
  };
  const onWheel = (e) => { e.preventDefault(); if (!S.cam) S.camDist = Math.max(2.4, Math.min(6.5, S.camDist + e.deltaY * 0.004)); };
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  // things you can tap: the works and the signs from the world, and what the game rooms add
  const ray = new T.Raycaster(), ndc = new T.Vector2();
  let targets = [];
  const refreshTargets = () => {
    targets = [];
    items.forEach((it) => { if (!it.hidden) it.targets.forEach((m) => { m.userData.item = it; targets.push(m); }); });
  };
  const bayaniMeshes = bayani.meshes;
  function tap(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // things first, then Bayani: he is made of light, so he never blocks a tap on something behind him
    const hit = ray.intersectObjects(targets, true).find((h) => h.object.visible);
    if (!hit) { if (H.k > 0.5 && ray.intersectObjects(bayaniMeshes, false).length) opts.onBayani && opts.onBayani(); return; }
    let o = hit.object; while (o && !o.userData.item && o.parent) o = o.parent;
    const it = o && o.userData.item;
    if (!it) return;
    const at = it.spot || it.at || { x: S.x, z: S.z };
    if (Math.hypot(at.x - S.x, at.z - S.z) <= (it.reach || TAP_REACH)) opts.onOpen && opts.onOpen(it);
    else opts.onFar && opts.onFar(it);
  }

  // ---- the game rooms ----
  const kit = {
    T, scene, camera, me, world,
    get x() { return S.x; }, get z() { return S.z; }, get yaw() { return S.yaw; }, get t() { return S.t; },
    get room() { return S.room; }, get near() { return S.near; },
    addItem(it) { if (items.indexOf(it) < 0) items.push(it); refreshTargets(); return it; },
    removeItem(it) { const i = items.indexOf(it); if (i >= 0) items.splice(i, 1); if (S.near === it) setNear(null); refreshTargets(); },
    refresh() { refreshTargets(); },
    blocked,
    setSpeed(k) { S.speedK = k; },
    setAim(fn) { S.aim = fn || null; S.move.x = S.move.y = 0; },
    setDrag(fn) { S.drag = fn || null; },
    setCamera(fn) { S.cam = fn || null; if (!fn) S.camShown = Math.min(S.camShown, 2.2); },
    // move and turn the player (when a game puts you somewhere)
    place(x, z, yaw) { if (!blocked(x, z, RADIUS)) { S.x = x; S.z = z; } if (yaw != null) S.yaw = yaw; },
    face(yaw) { S.yaw = yaw; },
    emit(type, data) { opts.onGame && opts.onGame(type, data || {}); },
    say(text) { opts.onSay && opts.onSay(text); },
    sound(name, on) { opts.onSound && opts.onSound(name, on); },
  };
  const rooms = {};
  (opts.rooms || []).forEach((make) => { const r = make(kit); rooms[r.id] = r; });
  refreshTargets();

  // ---- the loop ----
  let raf = 0, last = 0, running = false;
  const look = new T.Vector3();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    S.t += dt;
    if (S.paused) { if (!S.drawn) { render(); S.drawn = true; } return; } // nothing moves under a sheet
    S.drawn = false;
    step(dt);
    for (const id in rooms) rooms[id].update(dt);
    render();
  }
  function setNear(near) {
    S.near = near; ring.visible = !!near && !near.noRing;
    if (near && ring.visible) ring.position.set(near.spot.x, 0.02, near.spot.z);
    opts.onNear && opts.onNear(near);
  }
  function step(dt) {
    // where the stick or keys point
    let ix = S.move.x, iy = S.move.y;
    S.keys.forEach((k) => { ix += KEYS[k][0]; iy += KEYS[k][1]; });
    const len = Math.hypot(ix, iy); if (len > 1) { ix /= len; iy /= len; }
    if (S.aim) { S.aim(ix, iy, dt); ix = 0; iy = 0; } // aiming: the stick steers the game, not your feet
    const fwd = -iy, strafe = ix, amount = Math.min(1, Math.hypot(ix, iy));
    const fx = -Math.sin(S.camYaw), fz = -Math.cos(S.camYaw), rx = Math.cos(S.camYaw), rz = -Math.sin(S.camYaw);
    const sp = SPEED * S.speedK;
    const vx = (fx * fwd + rx * strafe) * sp, vz = (fz * fwd + rz * strafe) * sp;
    if (amount > 0.05) {
      const before = { x: S.x, z: S.z };
      slide(S, vx * dt, vz * dt, RADIUS);
      const moved = Math.hypot(S.x - before.x, S.z - before.z);
      S.phase += moved * 4.2;
      const want = Math.atan2(vx, vz);
      let d = want - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += d * Math.min(1, dt * 10);
      // walking forward swings the camera back behind the player
      if (S.t - S.lastDrag > 0.8) {
        const follow = Math.max(0, fwd - Math.abs(strafe)) * 1.4 * dt;
        let c = S.yaw + Math.PI - S.camYaw; c = Math.atan2(Math.sin(c), Math.cos(c)); S.camYaw += c * Math.min(1, follow);
      }
    }
    S.stride += ((amount > 0.05 ? amount * Math.min(1, S.speedK + 0.15) : 0) - S.stride) * Math.min(1, dt * 8);
    me.group.position.set(S.x, 0, S.z); me.group.rotation.y = S.yaw; me.pose(S.phase, S.stride, S.t, dt);

    // the room you are in, and the work or thing you are next to
    const rm = roomAt(S.x, S.z);
    if (rm && rm !== S.room) { S.room = rm; opts.onRoom && opts.onRoom(rm); }
    let near = null, nd = Infinity;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.spot || it.hidden || it.tapOnly) continue;
      const d = Math.hypot(it.spot.x - S.x, it.spot.z - S.z);
      if (d < (it.near || NEAR) && d < nd) { nd = d; near = it; }
    }
    if (near !== S.near) setNear(near);

    // Bayani the hologram: he is not there until he is needed. He appears beside a work when you stop at it, and
    // beside you when he has something to say; he fades when you walk on. While a game has the camera or the
    // stick, he keeps out of the picture.
    // he keeps real time (the museum's own clock runs slow on a slow device), so he comes and goes with his words
    const now = clock(), rdt = Math.min(0.25, Math.max(0, now - (H.last || now))); H.last = now;
    H.still = amount > 0.05 ? 0 : H.still + rdt;
    const work = S.near && S.near.type === 'work' ? S.near : null;
    const busy = !!(S.aim || (S.cam && !S.cam.test));
    const talking = now < H.until;
    if (!talking) H.fresh = false;
    const want = !busy && (talking || (H.on && !!H.at && H.at === work) || (!!work && H.still > 0.5));
    if (H.on && (!want || (work && H.at !== work && H.still > 0.5) || Math.hypot(H.x - S.x, H.z - S.z) > 4.2 || roomAt(H.x, H.z) !== S.room)) H.on = false;
    // he comes in at once for something new to say; after you have walked away from him, only once you stop
    if (want && !H.on && H.k < 0.02 && (H.fresh || H.still > 0.3)) {
      const at = work && (talking || H.still > 0.5) ? work : null, p = (at && besideWork(at)) || besideMe(amount > 0.05);
      if (p) {
        H.on = true; H.fresh = false; H.at = at; H.x = p[0]; H.z = p[1]; H.yaw = Math.atan2(S.x - H.x, S.z - H.z);
        bayani.wave(1.6);
      }
    }
    H.k += ((H.on ? 1 : 0) - H.k) * Math.min(1, rdt * (H.on ? 4.5 : 9));
    if (!H.on && H.k < 0.01) H.k = 0;
    H.yaw = turn(H.yaw, Math.atan2(S.x - H.x, S.z - H.z), dt * 5);
    bayani.group.position.set(H.x, 0, H.z); bayani.group.rotation.y = H.yaw;
    bayani.update(H.k, S.t, dt);
  }
  // where Bayani can stand: free floor in the room you are in
  const open = (p) => !blocked(p[0], p[1], 0.3) && !!S.room && roomAt(p[0], p[1]) === S.room;
  // beside you, where the camera sees him: to one side and a little past you. While you walk, a few steps ahead.
  function besideMe(walking) {
    const spots = [];
    if (walking) {
      const fx = Math.sin(S.yaw), fz = Math.cos(S.yaw); // the way you face; your right is (-fz, fx)
      [[2.4, 1.0], [2.4, -1.0], [1.5, 1.0], [1.5, -1.0]].forEach(([f, r]) => spots.push([S.x + fx * f - fz * r, S.z + fz * f + fx * r]));
    }
    const vx = -Math.sin(S.camYaw), vz = -Math.cos(S.camYaw); // the way the camera looks; its right is (-vz, vx)
    const tall = camera.aspect < 0.8; // a phone held upright sees less to each side, so he stands closer in and further on
    (tall ? [[1.0, 0.72], [1.0, -0.72], [1.7, 0.6], [1.7, -0.6]] : [[0.5, 1.05], [0.5, -1.05], [1.2, 0.8], [1.2, -0.8]])
      .concat([[-0.4, 1.05], [-0.4, -1.05], [1.4, 0], [2.0, 0.8], [2.0, -0.8], [-1.2, 0.8], [-1.2, -0.8]])
      .forEach(([f, r]) => spots.push([S.x + vx * f - vz * r, S.z + vz * f + vx * r]));
    return spots.find(open) || null;
  }
  // beside a work, like a guide: at its left edge as you look at it (the label hangs on the right), a step out from
  // the wall. Where a plant or a corner is in the way, he stands at your own side instead.
  function besideWork(it) {
    const w = it.work, tall = camera.aspect < 0.8;
    let cx, cz, nx, nz, side; // the work, the way from it to its reader, and how far to the side he stands
    if (w.stand) { cx = w.stand[0]; cz = w.stand[1]; nx = Math.sin(w.stand[2]); nz = Math.cos(w.stand[2]); side = 0.95; }
    else {
      cx = it.center.x; cz = it.center.z; side = w.wall[2] / 2 + 0.55;
      const d = Math.hypot(it.spot.x - cx, it.spot.z - cz) || 1; nx = (it.spot.x - cx) / d; nz = (it.spot.z - cz) / d;
    }
    const lx = -nz, lz = nx; // the reader's left
    const out = Math.hypot(it.spot.x - cx, it.spot.z - cz); // how far the reader stands from the work
    // a phone held upright sees less to each side: he comes in to the picture's corner
    const first = tall && !w.stand ? [Math.min(side, 1.15), 0.45] : [side, 0.25];
    const by = tall ? 0.8 : 1.0; // beside you
    return [first, [by, out], [-by, out], [by, out + 0.7]].map(([l, n]) => [cx + lx * l + nx * n, cz + lz * l + nz * n]).find(open) || null;
  }
  function gone() { H.on = false; H.k = 0; H.at = null; bayani.update(0, S.t, 0); }
  function turn(a, b, k) { let d = b - a; d = Math.atan2(Math.sin(d), Math.cos(d)); return a + d * Math.min(1, k); }
  const camAt = new T.Vector3(), camWant = new T.Vector3(), lookWant = new T.Vector3(), lookAt = new T.Vector3();
  let camBlend = 0;
  function render() {
    // follow camera: behind the player, pulled in so it never ends up outside a wall
    const ch = Math.cos(S.camPitch), dx = Math.sin(S.camYaw), dz = Math.cos(S.camYaw);
    const want = S.camDist * ch, can = Math.max(0.6, reach(S.x, S.z, dx, dz, want) - 0.15);
    S.camShown = can < S.camShown ? can : S.camShown + (can - S.camShown) * 0.12;
    // pushed in by a wall, the camera rises and looks down over your shoulder instead
    const pitch = Math.min(1.05, S.camPitch + Math.max(0, 2.6 - S.camShown) * 0.38);
    const h = Math.min(CEIL - 0.3, 1.05 + Math.max(0.6, S.camShown) * Math.tan(pitch));
    camWant.set(S.x + dx * S.camShown, h, S.z + dz * S.camShown);
    lookWant.set(S.x, 1.05, S.z);
    // a game room can take the camera (over the shoulder while you use the extinguisher); it eases in and out
    camBlend += ((S.cam ? 1 : 0) - camBlend) * 0.1;
    if (S.cam) { const c = S.cam(S); S.camLast = c; }
    if (camBlend > 0.002 && S.camLast) {
      const c = S.camLast;
      camWant.lerp(camAt.set(c.x, c.y, c.z), camBlend); lookWant.lerp(lookAt.set(c.lx, c.ly, c.lz), camBlend);
    }
    camera.position.copy(camWant);
    look.copy(lookWant); camera.lookAt(look);
    ring.rotation.y += 0.01;
    flicker.forEach((f) => { const k = f.userData.flick, sc = 0.78 + 0.32 * Math.abs(Math.sin(S.t * 7 + k.k)); f.scale.set(1, sc, 1); f.position.y = k.base + (k.h * sc) / 2; });
    items.forEach((it) => { if (it.bubble && it.bubble.visible) it.bubble.position.y = it.bubbleAt.y + Math.sin(S.t * 2.2 + it.bubbleAt.x) * 0.05; });
    renderer.render(scene, camera);
  }

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 68 : 58; camera.updateProjectionMatrix();
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
  resize();
  const onVis = () => { if (document.hidden) stop(); else start(); };
  document.addEventListener('visibilitychange', onVis);
  function start() { if (!running) { running = true; last = 0; raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); }
  start();

  return {
    get ready() { return ready; },
    rooms,
    setMove(x, y) { S.move.x = x; S.move.y = y; },
    setPaused(p) { S.paused = p; if (p) { S.move.x = S.move.y = 0; clearKeys(); pointers.clear(); } },
    setSeen(seen) { items.forEach((it) => { if (it.bubble && it.type === 'work') it.bubble.visible = !seen[it.id]; }); },
    // jump to a room (from the map): stand inside its main doorway, looking in
    goTo(id) {
      const r = room(id), c = { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 };
      const into = { lobby: [0, 6.0, Math.PI], bulwagan: [0, -2.2, Math.PI], kuwentuhan: [0, -13.4, Math.PI], mit: [-6.6, -6.0, -Math.PI / 2], prep: [6.6, -6.0, Math.PI / 2], resp: [-6.6, 4.5, -Math.PI / 2], rec: [6.6, 4.5, Math.PI / 2], fireroom: [-6.0, -13.6, -Math.PI / 2], gobagroom: [6.0, -13.6, Math.PI / 2] }[id];
      const [x, z, yaw] = into || [c.x, c.z, Math.PI];
      S.x = x; S.z = z; S.yaw = yaw; S.camYaw = yaw + Math.PI; S.camShown = 0.6;
      gone();
    },
    position() { return { x: S.x, z: S.z, yaw: S.yaw }; },
    place(p) {
      if (!p || blocked(p.x, p.z, RADIUS) || !roomAt(p.x, p.z)) return;
      S.x = p.x; S.z = p.z; S.yaw = p.yaw; S.camYaw = p.yaw + Math.PI; S.camShown = 0.6;
      gone();
    },
    // Bayani has something to say for this many seconds: he appears beside you, or beside the work you are at
    bayaniSays(secs) { H.until = clock() + (secs || 7.5); H.fresh = true; },
    // you called him with his button: he comes, or waves if he is already here
    callBayani() { H.until = clock() + 7.5; H.fresh = true; if (H.on) bayani.wave(1.4); },
    // what he said was closed: he goes, unless you are standing at a work
    bayaniHush() { H.until = 0; },
    // for tests and the walk-through recording: the player's state
    debug() {
      return {
        x: S.x, z: S.z, yaw: S.yaw, room: S.room && S.room.id, near: S.near && S.near.id, aiming: !!S.aim, speed: S.speedK,
        bayani: { on: H.on, shown: Math.round(H.k * 100) / 100, x: H.x, z: H.z, at: H.at && H.at.id, room: (roomAt(H.x, H.z) || {}).id || null },
      };
    },
    // for tests and screenshots: hold the camera at a spot, looking at a point (null gives it back)
    debugCamera(c) { S.cam = c ? Object.assign(() => c, { test: true }) : null; },
    // for tests: the things you can walk up to, and where to stand for each
    debugItems() { return items.filter((it) => !it.hidden).map((it) => ({ id: it.id, type: it.type, spot: it.spot || it.at || null, center: it.center || null })); },
    // for tests: where a point in the world shows up on the screen, in page pixels
    screenOf(x, y, z) { const v = new T.Vector3(x, y, z).project(camera), r = canvas.getBoundingClientRect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, front: v.z < 1 }; },
    dispose() {
      stop();
      for (const id in rooms) if (rooms[id].dispose) rooms[id].dispose();
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); window.removeEventListener('blur', clearKeys);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp); canvas.removeEventListener('wheel', onWheel);
      world.dispose();
      [me.group, bayani.group].forEach((g) => g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }));
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) { /* already lost */ }
    },
  };
}
