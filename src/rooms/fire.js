// The Fire Safety Room, played inside the museum. A small practice fire burns in a metal tray. Press the
// fire alarm by the door, take the extinguisher off the wall (your character carries it in both hands),
// stand a safe distance away with a clear way out behind you, then Pull the pin, Aim low, Squeeze and
// Sweep. How fast the fire drops, the hints, the empty extinguisher and the stars follow Fire Extinguisher
// 3D (see logic.js). The alarm and the way out behind you are checked and shown at the end.

import { fire as L, clamp } from './logic.js';
import { room } from '../museum/content.js';
import { sfx } from './sfx.js';

export const FIRE_ROOM = 'fireroom';
const FIRE = { x: -9, z: -18.55 };            // the tray's middle
const BASE_Y = 0.15;                           // top of the tray, where the flames start
const SAFE = { x: -9, z: -16.05 };             // a good place to stand: 2.5 m away, both doors behind you
const EXITS = [{ x: -11.3, z: -12.0 }, { x: -5.0, z: -13.6 }]; // the doorways out
const ALARM = { x: -9.85, z: -12.18 }, EXT = { x: -8.65, z: -12.2 };

function extinguisher(T) {
  const g = new T.Group();
  const M = (c) => new T.MeshLambertMaterial({ color: c });
  const red = M(0xd32f2f), black = M(0x26282b), metal = M(0x9aa3a8);
  const body = new T.Mesh(new T.CylinderGeometry(0.075, 0.078, 0.36, 20), red); body.position.y = 0; g.add(body);
  const top = new T.Mesh(new T.SphereGeometry(0.075, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), red); top.position.y = 0.18; g.add(top);
  const valve = new T.Mesh(new T.CylinderGeometry(0.028, 0.034, 0.07, 14), black); valve.position.y = 0.27; g.add(valve);
  const gauge = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.012, 16), M(0xffffff)); gauge.rotation.x = Math.PI / 2; gauge.position.set(0, 0.27, 0.036); g.add(gauge);
  // the carry handle (fixed) and the lever you squeeze (hinged at the back)
  const handle = new T.Mesh(new T.BoxGeometry(0.03, 0.016, 0.16), metal); handle.position.set(0, 0.3, -0.05); g.add(handle);
  const lever = new T.Group(); lever.position.set(0, 0.325, -0.11); g.add(lever);
  const lb = new T.Mesh(new T.BoxGeometry(0.03, 0.014, 0.17), metal); lb.position.set(0, 0, 0.075); lb.rotation.x = -0.18; lever.add(lb);
  // the safety pin, with its yellow ring
  const pin = new T.Group(); pin.position.set(0.035, 0.305, 0.0); g.add(pin);
  const ring = new T.Mesh(new T.TorusGeometry(0.026, 0.006, 8, 18), M(0xffc53d)); ring.position.x = 0.035; ring.rotation.y = Math.PI / 2; pin.add(ring);
  const rod = new T.Mesh(new T.CylinderGeometry(0.004, 0.004, 0.08, 6), metal); rod.rotation.z = Math.PI / 2; pin.add(rod);
  // the hose and the nozzle, pointing forward (+z)
  const curve = new T.CatmullRomCurve3([new T.Vector3(0, 0.27, 0.03), new T.Vector3(0.05, 0.22, 0.1), new T.Vector3(0.07, 0.1, 0.16), new T.Vector3(0.06, 0.02, 0.22)]);
  g.add(new T.Mesh(new T.TubeGeometry(curve, 16, 0.012, 8, false), black));
  const nozzle = new T.Group(); nozzle.position.set(0.06, 0.02, 0.22); g.add(nozzle);
  const nz = new T.Mesh(new T.ConeGeometry(0.02, 0.09, 12), black); nz.rotation.x = Math.PI / 2; nz.position.z = 0.04; nozzle.add(nz);
  const tip = new T.Object3D(); tip.position.z = 0.09; nozzle.add(tip);
  return { g, lever, pin, nozzle, tip };
}

function glowTexture(T) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), grad = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)'); grad.addColorStop(0.35, 'rgba(255,255,255,.75)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = grad; c.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(cv);
}

export function fireRoom(K) {
  const { T, scene, me } = K;
  const W = K.world.kit, colliders = K.world.colliders;
  const r = room(FIRE_ROOM);
  const root = new T.Group(); scene.add(root);
  const glow = glowTexture(T);

  // ---------- the practice fire ----------
  const tray = new T.Group(); tray.position.set(FIRE.x, 0, FIRE.z); root.add(tray);
  W.box(1.0, 0.12, 0.7, 0x5f666b, 0, 0.06, 0, tray); W.box(0.9, 0.02, 0.6, 0x2c2f33, 0, 0.125, 0, tray);
  [[-0.2, 0.3], [0.12, -0.4], [0.02, 1.2]].forEach(([dx, ry]) => { const log = W.add(new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.55, 10), W.lam(0x6b4423)), dx, 0.17, 0, tray); log.rotation.z = Math.PI / 2; log.rotation.y = ry; });
  colliders.push({ x0: FIRE.x - 0.6, x1: FIRE.x + 0.6, z0: FIRE.z - 0.45, z1: FIRE.z + 0.45, low: true });
  W.hang(r, 'N', -9, 2.75, W.plane(2.6, 0.65, W.basic(W.tex(W.signCanvas('Fire Practice', '#c62f22', '#ffffff', 'Alarm · Extinguisher · P · A · S · S')))));
  const boardCv = document.createElement('canvas'); boardCv.width = 640; boardCv.height = 400;
  const boardTex = W.tex(boardCv);
  W.hang(r, 'N', -11.75, 1.95, W.plane(1.15, 0.72, W.basic(boardTex)));
  function drawBoard(best) {
    const c = boardCv.getContext('2d'), w = 640, h = 400;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#fffaf0'; W.roundRect(c, 0, 0, w, h, 40); c.fill();
    c.fillStyle = '#c62f22'; W.roundRect(c, 0, 0, w, 110, 40); c.fill(); c.fillRect(0, 70, w, 40);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 58px "Baloo 2"'; c.fillText('Your best', w / 2, 62);
    const st = best && best.stars ? best.stars : 0;
    c.font = '900 92px Nunito'; c.fillStyle = '#eaa100'; c.fillText('★'.repeat(st) + '☆'.repeat(3 - st), w / 2, 210);
    c.fillStyle = '#16303f'; c.font = '800 40px Nunito';
    c.fillText(best && best.badge ? '🏅 Fire Out badge earned!' : st ? 'Get 3 stars for the badge' : 'Not played yet', w / 2, 320);
    boardTex.needsUpdate = true;
  }

  // flames: glowing points that rise and narrow, plus three soft cones for a solid heart
  const FN = 170;
  const fGeo = new T.BufferGeometry(), fPos = new Float32Array(FN * 3), fCol = new Float32Array(FN * 3), fSeed = [];
  for (let i = 0; i < FN; i++) fSeed.push({ ox: (Math.random() - 0.5) * 0.74, oz: (Math.random() - 0.5) * 0.46, h: 0.55 + Math.random() * 0.75, life: Math.random(), sp: 0.8 + Math.random() * 0.8 });
  fGeo.setAttribute('position', new T.BufferAttribute(fPos, 3)); fGeo.setAttribute('color', new T.BufferAttribute(fCol, 3));
  const flames = new T.Points(fGeo, new T.PointsMaterial({ size: 0.34, map: glow, vertexColors: true, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
  flames.frustumCulled = false; root.add(flames);
  const cones = [[-0.2, 0xf2760c, 0.55], [0.02, 0xffc53d, 0.75], [0.22, 0xf2760c, 0.5]].map(([dx, col, h], i) => {
    const m = W.add(new T.Mesh(new T.ConeGeometry(0.12, 1, 10), new T.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.85 })), FIRE.x + dx, BASE_Y, FIRE.z, root);
    m.userData = { h, k: i * 1.7 }; return m;
  });
  const light = new T.PointLight(0xff8a3d, 1, 7); light.position.set(FIRE.x, 0.8, FIRE.z); root.add(light);
  // smoke: grey puffs that rise and spread
  const SN = 36;
  const sGeo = new T.BufferGeometry(), sPos = new Float32Array(SN * 3), sSeed = [];
  for (let i = 0; i < SN; i++) sSeed.push({ ox: (Math.random() - 0.5) * 0.5, oz: (Math.random() - 0.5) * 0.3, life: Math.random(), sp: 0.25 + Math.random() * 0.25, drift: (Math.random() - 0.5) * 0.5 });
  sGeo.setAttribute('position', new T.BufferAttribute(sPos, 3));
  const smokeMat = new T.PointsMaterial({ size: 0.9, map: glow, color: 0x6f6a66, transparent: true, opacity: 0.3, depthWrite: false });
  const smoke = new T.Points(sGeo, smokeMat); smoke.frustumCulled = false; root.add(smoke);
  // the spray from the nozzle
  const PN = 260;
  const pGeo = new T.BufferGeometry(), pPos = new Float32Array(PN * 3), pSeed = [];
  for (let i = 0; i < PN; i++) { pSeed.push({ life: Math.random(), sp: 2.2 + Math.random() * 1.2, jx: (Math.random() - 0.5), jy: (Math.random() - 0.5), jz: (Math.random() - 0.5) }); pPos[i * 3 + 1] = -50; }
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
  const sprayMat = new T.PointsMaterial({ size: 0.24, map: glow, color: 0xc4dcf2, transparent: true, opacity: 0.92, depthWrite: false });
  const spray = new T.Points(pGeo, sprayMat); spray.frustumCulled = false; root.add(spray);

  // where the nozzle points while you use it: a ring that turns green on the base of the fire
  const reticleCv = W.canvas(128, 128, (c) => { c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.beginPath(); c.arc(64, 64, 48, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.arc(64, 64, 8, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill(); });
  const reticle = new T.Sprite(new T.SpriteMaterial({ map: W.tex(reticleCv), color: 0xffffff, depthTest: false, depthWrite: false, transparent: true }));
  reticle.scale.set(0.26, 0.26, 1); reticle.renderOrder = 5; reticle.visible = false; root.add(reticle);

  // ---------- by the south door: the alarm and the extinguisher ----------
  const alarm = new T.Group(); alarm.position.set(ALARM.x, 1.2, ALARM.z); root.add(alarm);
  W.box(0.24, 0.32, 0.07, 0xd32f2f, 0, 0, 0, alarm);
  const alarmCv = W.canvas(256, 128, (c) => { c.fillStyle = '#ffffff'; c.font = '900 64px Nunito'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FIRE', 128, 50); c.font = '800 30px Nunito'; c.fillText('PULL DOWN', 128, 100); });
  const alarmFace = W.add(W.plane(0.2, 0.1, W.basic(W.tex(alarmCv))), 0, 0.08, -0.037, alarm); alarmFace.rotation.y = Math.PI;
  const alarmHandle = W.box(0.14, 0.04, 0.05, 0xffffff, 0, -0.04, -0.05, alarm);
  const lamp = W.add(new T.Mesh(new T.SphereGeometry(0.05, 14, 10), new T.MeshBasicMaterial({ color: 0x7a1a12 })), 0, 0.3, -0.02, alarm);
  W.hang(r, 'S', ALARM.x, 1.72, W.plane(0.5, 0.13, W.basic(W.tex(W.signCanvas('FIRE ALARM', '#c62f22', '#ffffff')))));
  const ext = extinguisher(T);
  const bracket = new T.Group(); bracket.position.set(EXT.x, 0.62, EXT.z); bracket.rotation.y = Math.PI; root.add(bracket);
  W.box(0.2, 0.06, 0.06, 0x2b2b2b, 0, -0.17, 0.12, bracket);
  bracket.add(ext.g); ext.g.position.set(0, 0, 0.0);
  W.hang(r, 'S', EXT.x, 1.72, W.plane(0.5, 0.13, W.basic(W.tex(W.signCanvas('EXTINGUISHER', '#c62f22', '#ffffff')))));
  // where to stand (Easy): a ring on the floor with footprints
  const safe = new T.Group(); safe.position.set(SAFE.x, 0.025, SAFE.z); root.add(safe);
  const sr = new T.Mesh(new T.RingGeometry(0.5, 0.6, 40), new T.MeshBasicMaterial({ color: 0x1aa46a, transparent: true, opacity: 0.9, depthWrite: false })); sr.rotation.x = -Math.PI / 2; safe.add(sr);
  const sd = new T.Mesh(new T.CircleGeometry(0.5, 40), new T.MeshBasicMaterial({ color: 0x5fd39b, transparent: true, opacity: 0.28, depthWrite: false })); sd.rotation.x = -Math.PI / 2; safe.add(sd);
  const label = new T.Sprite(new T.SpriteMaterial({ map: W.tex(W.signCanvas('Stand here', '#1aa46a', '#ffffff')), depthWrite: false })); label.scale.set(0.9, 0.2, 1); label.position.set(0, 0.32, 0); safe.add(label);
  safe.visible = false;

  // ---------- things you can walk up to ----------
  const F = {
    phase: 'idle', level: 'easy', holding: false, pass: false, alarm: false, t0: null, aim: { x: 0, y: 0.75 }, lastAimX: 0, sweep: 0,
    st: null, sprayFrames: 0, baseFrames: 0, behindFrames: 0, distFrames: 0, chips: {}, emptyAt: null, pushT: 0, best: null, keys: null, pinFall: null,
  };
  const fresh = () => ({ pinPulled: false, spraying: false, aimAtBase: false, aimAtFire: false, sweeping: false, distance: 4, intensity: 100, agentLeft: 100 });
  F.st = { ...fresh(), intensity: 55 };

  const alarmItem = K.addItem({
    id: 'fx-alarm', type: 'room', room: FIRE_ROOM, spot: { x: ALARM.x, z: ALARM.z - 0.85 }, near: 0.75, targets: [alarm.children[0], alarmHandle],
    label: () => '🔔 Press the fire alarm',
    act: () => pressAlarm(),
  });
  const extItem = K.addItem({
    id: 'fx-ext', type: 'room', room: FIRE_ROOM, spot: { x: EXT.x, z: EXT.z - 0.85 }, near: 0.75, targets: [ext.g.children[0]],
    label: () => (F.holding ? '↩️ Hang it back' : '🧯 Take the extinguisher'),
    act: () => { if (F.holding) putBack(); else take(); },
  });
  const fireItem = K.addItem({
    id: 'fx-fire', type: 'room', room: FIRE_ROOM, spot: { x: FIRE.x, z: FIRE.z }, near: 4.8, noRing: true, hidden: true, targets: [tray.children[0]],
    label: () => '🧯 Use it here (PASS)',
    act: () => enterPass(),
  });

  // ---------- the round ----------
  function start(level) {
    F.level = level === 'hard' ? 'hard' : 'easy';
    F.phase = 'ready'; F.st = fresh(); F.t0 = null; F.alarm = F.alarmEarly || false; F.alarmEarly = false;
    F.sprayFrames = F.baseFrames = F.behindFrames = F.distFrames = 0; F.chips = {}; F.emptyAt = null; F.aim = { x: 0, y: 0.75 }; F.sweep = 0;
    ext.pin.visible = true; ext.pin.position.set(0.035, 0.305, 0); ext.pin.rotation.set(0, 0, 0); if (ext.pin.parent !== ext.g) ext.g.add(ext.pin);
    safe.visible = F.level === 'easy';
    if (!F.holding) take(true);
    K.say(F.alarm ? 'Good, the alarm is on. Now stand a safe distance from the fire, with the door behind you.'
      : 'First, press the fire alarm by the door so everyone knows. Then stand a safe distance from the fire, with the door behind you.');
    push(true);
  }
  function pressAlarm() {
    if (F.alarm) return;
    F.alarm = true; sfx.alarm(); F.alarmT = 3; alarmItem.hidden = true; K.refresh();
    if (F.phase !== 'ready') { F.alarmEarly = true; K.emit('fire:choose', {}); return; }
    K.say(F.holding ? 'The alarm is ringing. Now stand a safe distance from the fire, with the door behind you.' : 'The alarm is ringing. Now take the extinguisher.');
    push(true);
  }
  function take(fromStart) {
    if (F.phase !== 'ready' && !fromStart) { K.emit('fire:choose', {}); return; }
    F.holding = true; bracket.remove(ext.g); me.hold(ext.g);
    ext.g.position.set(-0.09, -0.07, 0.07); ext.g.rotation.set(0, 0, 0);
    sfx.pop(); fireItem.hidden = false; K.refresh();
    if (!fromStart && !F.alarm) K.say('Remember to press the fire alarm first, so others know.');
    push(true);
  }
  function putBack() {
    if (F.pass) exitPass();
    F.holding = false; me.hold(null); bracket.add(ext.g); ext.g.position.set(0, 0, 0); ext.g.rotation.set(0, 0, 0);
    fireItem.hidden = true; K.refresh(); sfx.drop(); push(true);
  }
  function enterPass() {
    if (!F.holding || F.phase !== 'ready' || F.pass) return;
    F.pass = true; if (F.t0 == null) F.t0 = K.t;
    fireItem.hidden = true; K.refresh();
    K.setAim((ix, iy, dt) => { F.aim.x = clamp(F.aim.x + ix * 1.7 * dt, -1, 1); F.aim.y = clamp(F.aim.y - iy * 1.1 * dt, 0, 1); });
    K.setDrag((dx, dy) => { F.aim.x = clamp(F.aim.x + dx * 0.0045, -1, 1); F.aim.y = clamp(F.aim.y - dy * 0.004, 0, 1); });
    K.setCamera(() => {
      const yaw = K.yaw, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
      const cx = Math.min(r.x1 - 0.3, Math.max(r.x0 + 0.3, K.x - fx * 1.9 + rx * 0.72)), cz = Math.min(r.z1 - 0.3, Math.max(r.z0 + 0.3, K.z - fz * 1.9 + rz * 0.72));
      return { x: cx, y: 1.85, z: cz, lx: FIRE.x, ly: 0.45, lz: FIRE.z };
    });
    F.keys = (e) => {
      if (e.target && e.target.closest && e.target.closest('input,textarea')) return;
      if (e.code === 'Space') { e.preventDefault(); squeeze(e.type === 'keydown'); }
      else if (e.type === 'keydown' && (e.code === 'KeyP' || e.code === 'Enter')) pull();
      else if (e.type === 'keydown' && e.code === 'KeyQ') step(1);
      else if (e.type === 'keydown' && e.code === 'KeyE') step(-1);
    };
    window.addEventListener('keydown', F.keys); window.addEventListener('keyup', F.keys);
    K.say(F.st.pinPulled ? 'Squeeze and sweep, aiming low at the base.' : 'Pull the pin first. Then aim low at the base, squeeze, and sweep.');
    push(true);
  }
  function exitPass() {
    if (!F.pass) return;
    F.pass = false; squeeze(false);
    K.setAim(null); K.setDrag(null); K.setCamera(null);
    if (F.keys) { window.removeEventListener('keydown', F.keys); window.removeEventListener('keyup', F.keys); F.keys = null; }
    if (F.phase === 'ready' && F.holding) fireItem.hidden = false;
    K.refresh(); push(true);
  }
  function pull() {
    if (!F.pass || F.st.pinPulled) return;
    F.st.pinPulled = true; F.chips.pull = true; sfx.click();
    // the pin drops to the floor
    const at = new T.Vector3(); ext.pin.getWorldPosition(at); root.attach(ext.pin); F.pinFall = { v: 0.6, spin: 4 };
    K.say('Pin pulled. Now aim at the base.');
    push(true);
  }
  function squeeze(on) {
    if (on && !F.pass) return;
    if (on && !F.st.pinPulled) { if (!F.squeezeSaid) { F.squeezeSaid = true; K.say('Pull the pin first.'); setTimeout(() => { F.squeezeSaid = false; }, 2500); } return; }
    if (on && F.st.agentLeft <= 0) return;
    if (F.st.spraying === on) return;
    F.st.spraying = on; ext.lever.rotation.x = on ? 0.28 : 0;
    if (on) F.chips.squeeze = true;
    sfx.hiss(on); push(true);
  }
  function step(dir) { // +1 closer, -1 back
    const dx = FIRE.x - K.x, dz = FIRE.z - K.z, d = Math.hypot(dx, dz) || 1;
    K.place(K.x + (dx / d) * 0.35 * dir, K.z + (dz / d) * 0.35 * dir);
  }
  function end(kind) {
    const timeSec = F.t0 == null ? 0 : K.t - F.t0, acc = F.sprayFrames > 0 ? F.baseFrames / F.sprayFrames : 1;
    const checks = [
      ['🔔', 'Pressed the fire alarm', F.alarm],
      ['🚪', 'Kept a clear way out behind you', F.sprayFrames > 0 && F.behindFrames / F.sprayFrames >= 0.7],
      ['📏', 'Stood a safe distance away', F.sprayFrames > 0 && F.distFrames / F.sprayFrames >= 0.7],
    ];
    exitPass();
    F.phase = kind;
    if (kind === 'won') {
      const stars = L.rateStars({ timeSec, aimAccuracy: acc, easy: F.level === 'easy' });
      sfx.cheer();
      K.say('Great job. You put out the fire!');
      K.emit('fire:result', { kind, level: F.level, stars, time: Math.round(timeSec * 10) / 10, accuracy: Math.round(acc * 100), checks });
    } else {
      sfx.sad();
      K.say('The extinguisher is empty and the fire is still burning. Get out fast, close the door, and call for help.');
      K.emit('fire:result', { kind, level: F.level, stars: 0, time: Math.round(timeSec * 10) / 10, accuracy: Math.round(acc * 100), checks });
    }
    push(true);
  }
  // after the result: the extinguisher goes back on the wall, a new practice fire is lit
  function reset() {
    if (F.pass) exitPass();
    if (F.holding) putBack();
    F.phase = 'idle'; F.alarm = false; F.alarmEarly = false; F.st = { ...fresh(), intensity: 55 };
    alarmItem.hidden = false; K.refresh();
    ext.pin.visible = true; ext.g.add(ext.pin); ext.pin.position.set(0.035, 0.305, 0); ext.pin.rotation.set(0, 0, 0);
    safe.visible = false; push(true);
  }

  // ---------- each frame ----------
  const tipAt = new T.Vector3(), target = new T.Vector3(), dir = new T.Vector3();
  function update(dt) {
    const st = F.st, t = K.t;
    // you walked out holding it: it goes back on the wall
    if (F.holding && K.room && K.room.id !== FIRE_ROOM) { putBack(); K.say('You left the Fire Safety Room, so the extinguisher went back on the wall.'); }
    // the alarm lamp blinks while it rings
    if (F.alarmT > 0) { F.alarmT -= dt; lamp.material.color.setHex(Math.floor(t * 6) % 2 ? 0xff3b2b : 0x7a1a12); alarmHandle.position.y = -0.09; } else { lamp.material.color.setHex(F.alarm ? 0xff3b2b : 0x7a1a12); alarmHandle.position.y = F.alarm ? -0.09 : -0.04; }

    if (F.pass) {
      // face the fire; the stick (or a drag) moves where the nozzle points
      K.face(Math.atan2(FIRE.x - K.x, FIRE.z - K.z));
      const yaw = K.yaw, rx = -Math.cos(yaw), rz = Math.sin(yaw);
      target.set(FIRE.x + rx * F.aim.x * 0.6, BASE_Y + F.aim.y * 1.2, FIRE.z + rz * F.aim.x * 0.6);
      st.aimAtFire = F.aim.y * 1.2 <= 1.5;
      st.aimAtBase = Math.abs(F.aim.x * 0.6) < 0.55 && F.aim.y <= 0.35;
      st.distance = Math.hypot(K.x - FIRE.x, K.z - FIRE.z);
      const rate = Math.abs(F.aim.x - F.lastAimX) / (dt || 0.016); F.lastAimX = F.aim.x;
      F.sweep = F.sweep * 0.85 + rate * 0.15; st.sweeping = F.sweep > 0.55;
      // the nozzle turns to where you aim
      ext.nozzle.lookAt(target);
      if (st.spraying && st.pinPulled && st.agentLeft > 0) {
        F.sprayFrames++; if (st.aimAtBase) { F.baseFrames++; F.chips.aim = true; }
        if (st.sweeping) F.chips.sweep = true;
        // the way out behind you, and a safe distance
        const near = EXITS.reduce((a, b) => (Math.hypot(b.x - K.x, b.z - K.z) < Math.hypot(a.x - K.x, a.z - K.z) ? b : a));
        const fx = FIRE.x - K.x, fz = FIRE.z - K.z, ex = near.x - K.x, ez = near.z - K.z;
        if ((fx * ex + fz * ez) / ((Math.hypot(fx, fz) * Math.hypot(ex, ez)) || 1) < 0) F.behindFrames++;
        if (st.distance >= 1.0 && st.distance <= 4.2) F.distFrames++;
        if (F.level === 'hard') st.agentLeft = clamp(st.agentLeft - dt * L.AGENT_USE, 0, 100);
        st.intensity = clamp(st.intensity - L.extinguishRate(st) * L.DROP * dt, 0, 100);
      }
    }
    // carried at your side while you walk, held in front while you use it
    if (F.holding) {
      me.setHoldStyle(F.pass ? 'front' : 'side');
      if (F.pass) ext.g.position.set(-0.09, -0.07, 0.07); else { ext.g.position.set(-0.29, -0.31, -0.25); ext.nozzle.rotation.set(0, 0, 0); }
    }
    if (F.phase === 'ready' && F.level === 'hard' && F.t0 != null) {
      const grow = L.growth(st);
      if (grow && st.intensity > 0) st.intensity = clamp(st.intensity + grow * dt, 0, 100);
    }
    if (st.agentLeft <= 0 && st.spraying) squeeze(false);
    if (F.phase === 'ready') {
      if (st.intensity <= 0.5) end('won');
      else if (st.agentLeft <= 0) { F.emptyAt = F.emptyAt == null ? t : F.emptyAt; if (t - F.emptyAt > 1.2) end('empty'); }
    }

    // the pin falls to the floor
    if (F.pinFall && ext.pin.position.y > 0.03) { F.pinFall.v += 9.8 * dt; ext.pin.position.y = Math.max(0.03, ext.pin.position.y - F.pinFall.v * dt); ext.pin.rotation.z += F.pinFall.spin * dt; }
    if (F.phase === 'idle' && ext.pin.parent === root) { ext.g.add(ext.pin); ext.pin.position.set(0.035, 0.305, 0); }

    // the fire, the smoke and the light follow the fire's strength
    const out = F.phase === 'won';
    const k = out ? 0 : clamp(st.intensity / 100, 0, 1), maxH = 0.25 + 1.0 * k;
    const active = out ? 0 : Math.floor(FN * (0.15 + 0.85 * k));
    for (let i = 0; i < FN; i++) {
      const s = fSeed[i];
      if (i >= active) { fPos[i * 3 + 1] = -50; continue; }
      s.life += dt * s.sp; if (s.life > 1) { s.life -= 1; s.ox = (Math.random() - 0.5) * 0.74 * (0.5 + 0.5 * k); s.oz = (Math.random() - 0.5) * 0.46 * (0.5 + 0.5 * k); }
      const L2 = s.life;
      fPos[i * 3] = FIRE.x + s.ox * (1 - L2 * 0.65); fPos[i * 3 + 1] = BASE_Y + L2 * s.h * maxH; fPos[i * 3 + 2] = FIRE.z + s.oz * (1 - L2 * 0.65);
      fCol[i * 3] = 1; fCol[i * 3 + 1] = 0.3 + L2 * 0.55; fCol[i * 3 + 2] = L2 * 0.15;
    }
    fGeo.attributes.position.needsUpdate = true; fGeo.attributes.color.needsUpdate = true;
    flames.material.opacity = 0.35 + 0.6 * k;
    cones.forEach((c) => { const sc = (0.78 + 0.32 * Math.abs(Math.sin(t * 7 + c.userData.k))) * c.userData.h * Math.max(0.05, k); c.visible = k > 0.03; c.scale.set(0.6 + 0.6 * k, sc, 0.6 + 0.6 * k); c.position.y = BASE_Y + sc / 2; });
    light.intensity = k > 0 ? (0.35 + 1.4 * k) * (0.85 + Math.random() * 0.3) : 0;
    const smokeK = out ? Math.max(0, (F.smokeLeft = (F.smokeLeft == null ? 3 : F.smokeLeft) - dt) / 3) : 0.35 + 0.65 * k;
    if (!out) F.smokeLeft = null;
    for (let i = 0; i < SN; i++) {
      const s = sSeed[i];
      s.life += dt * s.sp; if (s.life > 1) s.life -= 1;
      sPos[i * 3] = FIRE.x + s.ox + s.drift * s.life; sPos[i * 3 + 1] = BASE_Y + 0.5 + s.life * 2.4 * (0.4 + 0.6 * k); sPos[i * 3 + 2] = FIRE.z + s.oz + s.life * 0.3;
    }
    sGeo.attributes.position.needsUpdate = true; smokeMat.opacity = 0.32 * smokeK;
    // the spray: from the nozzle to where you aim
    const spraying = F.pass && st.spraying && st.pinPulled && st.agentLeft > 0;
    ext.tip.getWorldPosition(tipAt);
    dir.copy(target).sub(tipAt); const dist = dir.length() || 1; dir.divideScalar(dist);
    for (let i = 0; i < PN; i++) {
      const s = pSeed[i];
      if (!spraying) { pPos[i * 3 + 1] = -50; continue; }
      s.life += dt * s.sp / Math.max(0.6, dist); if (s.life > 1) { s.life -= 1; s.jx = Math.random() - 0.5; s.jy = Math.random() - 0.5; s.jz = Math.random() - 0.5; }
      const spread = 0.02 + s.life * 0.35;
      pPos[i * 3] = tipAt.x + dir.x * dist * s.life + s.jx * spread; pPos[i * 3 + 1] = tipAt.y + dir.y * dist * s.life + s.jy * spread; pPos[i * 3 + 2] = tipAt.z + dir.z * dist * s.life + s.jz * spread;
    }
    pGeo.attributes.position.needsUpdate = true;

    safe.visible = F.level === 'easy' && F.phase === 'ready' && !F.pass;
    reticle.visible = F.pass; if (F.pass) { reticle.position.copy(target); reticle.material.color.setHex(st.aimAtBase ? 0x5fd39b : st.aimAtFire ? 0xffc53d : 0xffffff); }
    // what the screen shows, a few times a second
    F.pushT -= dt; if (F.pushT <= 0) push();
  }

  function push() {
    F.pushT = 0.12;
    const st = F.st;
    K.emit('fire', {
      phase: F.phase, level: F.level, holding: F.holding, pass: F.pass, alarm: F.alarm,
      intensity: Math.round(st.intensity), agent: Math.round(st.agentLeft), pinPulled: st.pinPulled, spraying: st.spraying,
      aimAtBase: st.aimAtBase, sweeping: st.sweeping, distance: Math.round(st.distance * 10) / 10, chips: { ...F.chips },
      hint: F.pass ? L.nextHint(st) : null, secs: F.t0 == null ? 0 : Math.floor(K.t - F.t0), aim: { x: F.aim.x, y: F.aim.y },
    });
  }

  return {
    id: 'fire',
    get phase() { return F.phase; },
    start, pressAlarm, take, putBack, enterPass, exitPass, pull, squeeze, step, reset,
    setBest(best) { F.best = best; drawBoard(best); },
    update,
    dispose() { if (F.keys) { window.removeEventListener('keydown', F.keys); window.removeEventListener('keyup', F.keys); } sfx.hiss(false); glow.dispose(); },
    debug() { return { phase: F.phase, level: F.level, holding: F.holding, pass: F.pass, alarm: F.alarm, st: { ...F.st }, aim: { ...F.aim }, fire: FIRE, safe: SAFE, ext: { x: EXT.x, z: EXT.z - 0.85 }, alarmSpot: { x: ALARM.x, z: ALARM.z - 0.85 } }; },
  };
}
