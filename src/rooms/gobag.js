// The Go Bag Room, played inside the museum. Take an empty go bag from the packing table, walk to the
// tables (Easy) or open the cabinet, drawers, crate and cooler (Difficult), look at each thing and pack it
// or leave it, then zip it up. Your character carries the bag on the back and it swells as it fills; pack
// too much and you walk slower. The items, their notes, the scoring and the stars are those of Go Bag
// Packing 3D (see logic.js).

import { CAPACITY, gobag as L } from './logic.js';
import { makeItem } from './items3d.js';
import { room } from '../museum/content.js';
import { sfx } from './sfx.js';

export const GOBAG_ROOM = 'gobagroom';
const SCALE = 1.7;          // the items, bigger than life so they read from a few steps away
const SCALE_IN = 1.45;      // inside the containers
const REACH = 2.9;          // how far away you can tap an item
const NEAR_STATION = 1.05;  // how close to a table you need to be to see its tray
// the tables (Easy) and, in the same places, the containers (Difficult); the cooler is Difficult only
const SPOTS = [
  { id: 't1', x: 6.9, z: -16.4, w: 1.6, d: 0.8 },
  { id: 't2', x: 11.1, z: -16.4, w: 1.6, d: 0.8 },
  { id: 't3', x: 9.0, z: -14.2, w: 1.6, d: 0.8 },
  { id: 'c4', x: 11.7, z: -18.95, w: 0.8, d: 0.5, hardOnly: true },
];
const COUNTER = { x: 9, z: -19.32, w: 1.8, d: 0.56 };

export function goBagRoom(K) {
  const { T, scene, me } = K;
  const W = K.world.kit, colliders = K.world.colliders;
  const r = room(GOBAG_ROOM);
  const lam = W.lam, box = W.box;
  const root = new T.Group(); scene.add(root);
  const v = new T.Vector3();

  // ---------- furniture ----------
  const solidRect = (s) => ({ x0: s.x - s.w / 2, x1: s.x + s.w / 2, z0: s.z - s.d / 2, z1: s.z + s.d / 2, low: true });
  const addCollider = (c) => { if (colliders.indexOf(c) < 0) colliders.push(c); };
  const dropCollider = (c) => { const i = colliders.indexOf(c); if (i >= 0) colliders.splice(i, 1); };

  // the packing table at the north wall, with empty go bags on it, and the challenge sign above
  const counter = new T.Group(); counter.position.set(COUNTER.x, 0, COUNTER.z); root.add(counter);
  box(COUNTER.w, 0.8, COUNTER.d, 0x128253, 0, 0.4, 0, counter);
  box(COUNTER.w + 0.08, 0.06, COUNTER.d + 0.08, 0xb07a3c, 0, 0.83, 0, counter);
  const emptyBag = (x) => {
    const b = new T.Group(); b.position.set(x, 0.86, 0); counter.add(b);
    box(0.34, 0.4, 0.17, 0xe2382b, 0, 0.2, 0, b); box(0.3, 0.14, 0.06, 0xb8261b, 0, 0.11, 0.1, b); box(0.34, 0.06, 0.18, 0xb8261b, 0, 0.42, 0, b);
    return b;
  };
  const shelfBags = [emptyBag(-0.5), emptyBag(0), emptyBag(0.5)];
  addCollider(solidRect(COUNTER));
  W.hang(r, 'N', 9, 2.75, W.plane(2.6, 0.65, W.basic(W.tex(W.signCanvas('Go Bag Challenge', '#0c7a4a', '#ffffff', 'Take a bag · Pack · Zip it up')))));
  // your best, on a small board beside the sign
  const boardCv = document.createElement('canvas'); boardCv.width = 640; boardCv.height = 400;
  const boardTex = W.tex(boardCv);
  W.hang(r, 'N', 11.75, 1.95, W.plane(1.15, 0.72, W.basic(boardTex)));
  function drawBoard(best) {
    const c = boardCv.getContext('2d'), w = 640, h = 400;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#fffaf0'; W.roundRect(c, 0, 0, w, h, 40); c.fill();
    c.fillStyle = '#0c7a4a'; W.roundRect(c, 0, 0, w, 110, 40); c.fill(); c.fillRect(0, 70, w, 40);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '800 58px "Baloo 2"'; c.fillText('Your best', w / 2, 62);
    const st = best && best.stars ? best.stars : 0;
    c.font = '900 92px Nunito'; c.fillStyle = '#eaa100'; c.fillText('★'.repeat(st) + '☆'.repeat(3 - st), w / 2, 210);
    c.fillStyle = '#16303f'; c.font = '800 40px Nunito';
    c.fillText(best && best.badge ? '🏅 Go Bag badge earned!' : st ? 'Get 3 stars for the badge' : 'Not played yet', w / 2, 320);
    boardTex.needsUpdate = true;
  }

  // a giant go bag in the corner, as before
  const giant = new T.Group(); giant.position.set(6.6, 0, -19.0); giant.rotation.y = 0.4; root.add(giant);
  W.add(new T.Mesh(new T.CylinderGeometry(0.75, 0.75, 0.12, 32), lam(0xffffff)), 0, 0.06, 0, giant);
  box(0.95, 1.15, 0.55, 0xe2382b, 0, 0.7, 0, giant); box(0.7, 0.45, 0.12, 0xb8261b, 0, 0.55, 0.32, giant); box(0.95, 0.12, 0.6, 0xb8261b, 0, 1.3, 0, giant);
  box(0.12, 1.0, 0.06, 0x7a1a12, -0.28, 0.75, -0.3, giant); box(0.12, 1.0, 0.06, 0x7a1a12, 0.28, 0.75, -0.3, giant);
  W.add(new T.Mesh(new T.TorusGeometry(0.14, 0.03, 8, 16, Math.PI), lam(0x7a1a12)), 0, 1.36, 0, giant);
  addCollider({ x0: 5.95, x1: 7.25, z0: -19.65, z1: -18.35 });

  // tables (Easy)
  const tables = SPOTS.filter((s) => !s.hardOnly).map((s) => {
    const g = new T.Group(); g.position.set(s.x, 0, s.z); root.add(g);
    box(s.w, 0.08, s.d, 0xb07a3c, 0, 0.75, 0, g);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => box(0.07, 0.75, 0.07, 0x6e4826, a * (s.w / 2 - 0.1), 0.375, b * (s.d / 2 - 0.08), g));
    // slots on the top: three at the back, two at the front
    const slots = [[-0.52, -0.18], [0, -0.2], [0.52, -0.18], [-0.27, 0.2], [0.27, 0.2]].map(([dx, dz]) => ({ x: s.x + dx, y: 0.79, z: s.z + dz, scale: SCALE }));
    return { ...s, kind: 'table', name: 'the table', group: g, slots, open: true, look: 0.8 };
  });
  SPOTS.forEach((s) => addCollider(s.col = solidRect(s)));
  dropCollider(SPOTS[3].col); // the cooler's place is free until a Difficult round

  // containers (Difficult): a cabinet, a chest of drawers, a crate and a cooler; each opens to show what is inside
  const containers = [];
  { // the cabinet, doors facing south
    const s = SPOTS[0], g = new T.Group(); g.position.set(s.x, 0, s.z); root.add(g);
    const cw = 1.3, ch = 1.05, cd = 0.55;
    box(cw, 0.04, cd, 0xc9ad84, 0, 0.02, 0, g); box(cw, 0.04, cd, 0xc9ad84, 0, ch - 0.02, 0, g);
    box(0.04, ch, cd, 0xc9ad84, -cw / 2 + 0.02, ch / 2, 0, g); box(0.04, ch, cd, 0xc9ad84, cw / 2 - 0.02, ch / 2, 0, g);
    box(cw, ch, 0.03, 0xb39670, 0, ch / 2, -cd / 2 + 0.015, g); box(cw - 0.08, 0.03, cd - 0.04, 0xc9ad84, 0, 0.52, 0, g);
    const doors = [-1, 1].map((sd) => {
      const p = new T.Group(); p.position.set(sd * cw / 2, 0, cd / 2); g.add(p);
      box(cw / 2 - 0.01, ch - 0.04, 0.035, 0xe0c9a2, -sd * (cw / 4), ch / 2, 0.018, p);
      box(0.03, 0.14, 0.04, 0x6e4826, -sd * (cw / 2 - 0.08), ch / 2, 0.05, p);
      return { p, open: -sd * 1.75 };
    });
    const slots = [[-0.32, 0.555], [0.32, 0.555], [-0.32, 0.045], [0.32, 0.045]].map(([dx, y]) => ({ x: s.x + dx, y, z: s.z + 0.02, scale: SCALE_IN }));
    containers.push({ ...s, kind: 'cabinet', name: 'the cabinet', look: 0.35, group: g, slots, parts: doors.map((d) => ({ obj: d.p, axis: 'y', to: d.open })) });
  }
  { // the chest of drawers
    const s = SPOTS[1], g = new T.Group(); g.position.set(s.x, 0, s.z); root.add(g);
    const cw = 1.2, ch = 0.82, cd = 0.55;
    box(cw, 0.04, cd, 0x8a5a33, 0, ch - 0.02, 0, g); box(0.04, ch, cd, 0x8a5a33, -cw / 2 + 0.02, ch / 2, 0, g); box(0.04, ch, cd, 0x8a5a33, cw / 2 - 0.02, ch / 2, 0, g);
    box(cw, ch, 0.03, 0x744a2a, 0, ch / 2, -cd / 2 + 0.015, g); box(cw, 0.04, cd, 0x8a5a33, 0, 0.02, 0, g);
    const drawers = [0.43, 0.06].map((y0) => {
      const p = new T.Group(); p.position.set(0, 0, 0); g.add(p);
      box(cw - 0.1, 0.03, cd - 0.06, 0xa87346, 0, y0 + 0.015, 0, p);
      box(cw - 0.1, 0.32, 0.03, 0xb98257, 0, y0 + 0.16, cd / 2 - 0.02, p);
      box(cw - 0.1, 0.2, 0.025, 0xa87346, 0, y0 + 0.1, -cd / 2 + 0.05, p);
      box(0.025, 0.2, cd - 0.06, 0xa87346, -(cw - 0.1) / 2, y0 + 0.1, 0, p); box(0.025, 0.2, cd - 0.06, 0xa87346, (cw - 0.1) / 2, y0 + 0.1, 0, p);
      box(0.2, 0.035, 0.04, 0x3d2817, 0, y0 + 0.17, cd / 2 + 0.01, p);
      return { p, y0 };
    });
    const slots = [];
    drawers.forEach((d) => [-0.27, 0.27].forEach((dx) => slots.push({ x: s.x + dx, y: d.y0 + 0.03, z: s.z, scale: SCALE_IN, parent: d.p })));
    containers.push({ ...s, kind: 'drawers', name: 'the drawers', look: 0.3, group: g, slots, parts: drawers.map((d, i) => ({ obj: d.p, axis: 'z', to: i ? 0.47 : 0.27 })) });
  }
  { // the crate, lid hinged at the back
    const s = SPOTS[2], g = new T.Group(); g.position.set(s.x, 0, s.z); root.add(g);
    const cw = 1.0, ch = 0.5, cd = 0.7;
    for (let i = 0; i < 4; i++) {
      box(cw, 0.1, 0.03, 0xc79a5b, 0, 0.07 + i * 0.12, cd / 2 - 0.015, g); box(cw, 0.1, 0.03, 0xc79a5b, 0, 0.07 + i * 0.12, -cd / 2 + 0.015, g);
      box(0.03, 0.1, cd, 0xc79a5b, -cw / 2 + 0.015, 0.07 + i * 0.12, 0, g); box(0.03, 0.1, cd, 0xc79a5b, cw / 2 - 0.015, 0.07 + i * 0.12, 0, g);
    }
    box(cw - 0.04, 0.03, cd - 0.04, 0xa87d45, 0, 0.2, 0, g);
    const hinge = new T.Group(); hinge.position.set(0, ch, -cd / 2); g.add(hinge);
    box(cw + 0.04, 0.05, cd + 0.04, 0xb88a4e, 0, 0.025, cd / 2, hinge);
    box(cw + 0.04, 0.02, 0.08, 0x8a6236, 0, 0.06, cd / 2, hinge);
    const slots = [[-0.3, 0.215, 0], [0.05, 0.215, 0.05], [0.33, 0.215, -0.05]].map(([dx, y, dz]) => ({ x: s.x + dx, y, z: s.z + dz, scale: SCALE_IN }));
    containers.push({ ...s, kind: 'crate', name: 'the crate', look: 0.25, group: g, slots, parts: [{ obj: hinge, axis: 'x', to: -1.95 }] });
  }
  { // the cooler, lid hinged at the back
    const s = SPOTS[3], g = new T.Group(); g.position.set(s.x, 0, s.z); root.add(g);
    const cw = 0.8, ch = 0.45, cd = 0.5;
    box(cw, 0.04, cd, 0x2f74d0, 0, 0.02, 0, g);
    box(cw, ch, 0.04, 0x2f74d0, 0, ch / 2, cd / 2 - 0.02, g); box(cw, ch, 0.04, 0x2f74d0, 0, ch / 2, -cd / 2 + 0.02, g);
    box(0.04, ch, cd, 0x2f74d0, -cw / 2 + 0.02, ch / 2, 0, g); box(0.04, ch, cd, 0x2f74d0, cw / 2 - 0.02, ch / 2, 0, g);
    box(cw - 0.08, 0.02, cd - 0.08, 0xdfeef8, 0, 0.12, 0, g);
    const hinge = new T.Group(); hinge.position.set(0, ch, -cd / 2); g.add(hinge);
    box(cw + 0.02, 0.08, cd + 0.02, 0xf4f7f9, 0, 0.04, cd / 2, hinge);
    box(0.36, 0.04, 0.05, 0x1f5f95, 0, 0.1, cd / 2, hinge);
    const slots = [[-0.2, 0.13, 0], [0.18, 0.13, -0.05], [0.0, 0.13, 0.08]].map(([dx, y, dz]) => ({ x: s.x + dx, y, z: s.z + dz, scale: SCALE_IN * 0.9 }));
    containers.push({ ...s, kind: 'cooler', name: 'the cooler', look: 0.2, group: g, slots, parts: [{ obj: hinge, axis: 'x', to: -1.7 }] });
  }
  const showSet = (hard) => {
    tables.forEach((t) => { t.group.visible = !hard; });
    containers.forEach((c) => { c.group.visible = hard; });
    if (hard) addCollider(SPOTS[3].col); else dropCollider(SPOTS[3].col);
  };

  // ---------- things you can walk up to ----------
  const counterItem = K.addItem({
    id: 'gb-counter', type: 'room', room: GOBAG_ROOM, spot: { x: COUNTER.x, z: COUNTER.z + 1.05 }, near: 1.35,
    targets: shelfBags.map((b) => b.children[0]),
    label: () => (G.phase === 'packing' ? '🤐 Zip it up' : G.phase === 'done' ? '🎒 Pack again' : '🎒 Take a go bag'),
    act: () => { if (G.phase === 'packing') finish(); else K.emit('gobag:choose', { again: G.phase === 'done' }); },
  });
  const containerItems = containers.map((c) => K.addItem({
    id: 'gb-' + c.kind, type: 'room', room: GOBAG_ROOM, hidden: true, near: 1.3,
    spot: { x: c.x, z: c.z + c.d / 2 + 0.72 }, targets: [c.group.children[0]],
    label: () => '🔓 Open ' + c.name,
    act: () => openContainer(c),
  }));

  // ---------- the round ----------
  const G = { phase: 'idle', level: 'easy', tray: [], packed: [], pieces: [], station: null, overSaid: false, best: null, trayKey: '' };
  const stations = () => (G.level === 'hard' ? containers : tables);

  function clearPieces() {
    G.pieces.forEach((p) => { if (p.mesh.parent) p.mesh.parent.remove(p.mesh); K.removeItem(p.item); });
    G.pieces = [];
  }
  // lay a round's things out on the stations' slots
  function layout(tray, level) {
    clearPieces();
    const sts = level === 'hard' ? containers : tables;
    const counts = level === 'hard' ? [4, 4, 3, 3] : [5, 5, 4];
    let k = 0;
    sts.forEach((st, si) => {
      for (let j = 0; j < counts[si] && k < tray.length; j++, k++) {
        const def = tray[k], slot = st.slots[j];
        const mesh = makeItem(T, def.id); mesh.scale.setScalar(slot.scale); mesh.rotation.y = (Math.random() - 0.5) * 0.7;
        const parent = slot.parent || root;
        if (slot.parent) { mesh.position.set(slot.x - st.x, slot.y, slot.z - st.z); parent.add(mesh); } else { mesh.position.set(slot.x, slot.y, slot.z); root.add(mesh); }
        const piece = { def, mesh, st, slot, packed: false, fly: null };
        piece.item = K.addItem({ id: 'gbi-' + def.id, type: 'room', tapOnly: true, room: GOBAG_ROOM, at: { x: slot.x, z: slot.z }, reach: REACH, targets: [mesh], hidden: level === 'hard', act: () => look(def.id) });
        G.pieces.push(piece);
      }
    });
  }
  const pieceOf = (id) => G.pieces.find((p) => p.def.id === id);
  const weight = () => L.bagWeight(G.packed.map((id) => L.byId(id)));

  function start(level) {
    G.level = level === 'hard' ? 'hard' : 'easy';
    G.tray = L.buildRound(); G.packed = []; G.overSaid = false; G.leftSaid = false; G.t0 = K.t;
    showSet(G.level === 'hard');
    containers.forEach((c) => { c.open = false; c.parts.forEach((p) => { p.cur = 0; apply(p, 0); }); });
    containerItems.forEach((it) => { it.hidden = G.level !== 'hard'; });
    layout(G.tray, G.level);
    G.phase = 'packing';
    me.setBag(true, 0); K.setSpeed(1); sfx.pop();
    K.refresh();
    K.say(G.level === 'hard'
      ? 'The supplies are hidden. Open the cabinet, the drawers, the crate and the cooler. Your bag has limited room, so choose what matters most.'
      : 'Walk to the tables and tap a thing to look at it. Your bag has limited room, so choose the supplies that matter most.');
    push(true);
  }
  function openContainer(c) {
    if (G.phase !== 'packing') { K.say('Take an empty go bag from the packing table first.'); return; }
    if (c.open) return;
    c.open = true; sfx.open();
    containerItems[containers.indexOf(c)].hidden = true;
    G.pieces.forEach((p) => { if (p.st === c && !p.packed) p.item.hidden = false; });
    K.refresh();
    const n = G.pieces.filter((p) => p.st === c && !p.packed).length;
    K.say(n ? 'You found ' + n + ' thing' + (n === 1 ? '' : 's') + ' in ' + c.name + '. Tap one to look at it.' : 'This one is empty. Keep searching.');
    push(true);
  }
  // look at one thing: the card with its note and Pack it or Leave it
  function look(id) {
    if (G.phase !== 'packing') { K.say('Take an empty go bag from the packing table first.'); return; }
    const def = L.byId(id); if (!def) return;
    K.emit('gobag:look', { id, name: def.name, icon: def.icon, info: def.info, weight: def.weight, packed: G.packed.indexOf(id) >= 0 });
  }
  function pack(id) {
    const p = pieceOf(id); if (!p || p.packed || G.phase !== 'packing') return;
    p.packed = true; G.packed.push(id); p.item.hidden = true; K.refresh();
    // it flies from where it was into the bag on your back
    p.mesh.getWorldPosition(v); const from = v.clone();
    root.attach(p.mesh); p.fly = { t: 0, from };
    me.reach(); sfx.pop();
    const w = weight();
    if (w > CAPACITY && !G.overSaid) { G.overSaid = true; K.say('Your bag is getting heavy. Pick what matters most.'); }
    push(true);
  }
  function unpack(id) {
    const p = pieceOf(id); if (!p || !p.packed) return;
    p.packed = false; p.fly = null; G.packed = G.packed.filter((x) => x !== id);
    if (p.slot.parent) { p.slot.parent.attach(p.mesh); p.mesh.position.set(p.slot.x - p.st.x, p.slot.y, p.slot.z - p.st.z); } else p.mesh.position.set(p.slot.x, p.slot.y, p.slot.z);
    p.mesh.scale.setScalar(p.slot.scale); p.mesh.visible = true;
    p.item.hidden = G.level === 'hard' && !p.st.open; K.refresh();
    sfx.drop(); push(true);
  }
  function finish() {
    if (G.phase !== 'packing') return;
    const res = L.scoreRound(G.tray, G.packed), stars = L.rateStars(res);
    const missed = G.tray.filter((t) => t.good && G.packed.indexOf(t.id) === -1);
    const wrong = G.tray.filter((t) => !t.good && G.packed.indexOf(t.id) !== -1);
    const line = 'You packed ' + res.packedGood + ' of ' + res.totalGood + ' useful items' + (res.wrongPacks > 0 ? ', and ' + res.wrongPacks + ' that could stay home.' : '.');
    G.phase = 'done'; sfx.zip(); if (stars >= 3) setTimeout(() => sfx.cheer(), 450);
    // the things left behind go away; your packed bag stays on your back
    G.pieces.forEach((p) => { if (!p.packed) { p.mesh.visible = false; p.item.hidden = true; } });
    containerItems.forEach((it) => { it.hidden = true; });
    K.refresh(); K.setSpeed(1);
    K.say('Nice work. ' + line);
    K.emit('gobag:result', {
      level: G.level, stars, line, res, weight: weight(), cap: CAPACITY, secs: Math.round(K.t - G.t0),
      missed: missed.map((d) => ({ icon: d.icon, name: d.name, info: d.info })),
      wrong: wrong.map((d) => ({ icon: d.icon, name: d.name, info: d.info })),
      packed: G.packed.map((id) => { const d = L.byId(id); return { icon: d.icon, name: d.name }; }),
    });
    push(true);
  }
  // leave the round without scoring (from the bag sheet): put everything back as it was before
  function quit() {
    if (G.phase !== 'packing') return;
    G.phase = 'idle'; me.setBag(false, 0); K.setSpeed(1);
    showSet(false); containerItems.forEach((it) => { it.hidden = true; });
    layout(L.buildRound(), 'easy'); K.refresh(); push(true);
  }

  // ---------- each frame ----------
  function apply(p, k) {
    if (p.axis === 'y') p.obj.rotation.y = p.to * k;
    else if (p.axis === 'x') p.obj.rotation.x = p.to * k;
    else p.obj.position.z = p.to * k;
  }
  const bagAt = new T.Vector3();
  function update(dt) {
    // doors and lids swing open
    containers.forEach((c) => c.parts.forEach((p) => { const want = c.open ? 1 : 0; if ((p.cur || 0) !== want) { p.cur = want ? Math.min(1, (p.cur || 0) + dt * 2.6) : Math.max(0, (p.cur || 0) - dt * 3); apply(p, p.cur * p.cur * (3 - 2 * p.cur)); } }));
    // packed things fly into the bag
    me.bag.getWorldPosition(bagAt);
    G.pieces.forEach((p) => {
      if (!p.fly) return;
      p.fly.t = Math.min(1, p.fly.t + dt / 0.5);
      const k = p.fly.t, e = k * k * (3 - 2 * k);
      p.mesh.position.lerpVectors(p.fly.from, bagAt, e); p.mesh.position.y += Math.sin(k * Math.PI) * 0.5;
      p.mesh.scale.setScalar(p.slot.scale * (1 - 0.75 * e));
      if (k >= 1) { p.mesh.visible = false; p.fly = null; }
    });
    // walking out in the middle of a round: the bag stays on your back, and Bayani reminds you once
    const inRoom = !!(K.room && K.room.id === GOBAG_ROOM);
    if (G.phase === 'packing' && G.wasIn && !inRoom && !G.leftSaid) { G.leftSaid = true; K.say('Your go bag is not zipped up yet. Come back to the Go Bag Room to finish packing.'); }
    G.wasIn = inRoom;
    // the bag swells with what is in it; too much, and you walk slower
    if (G.phase === 'packing' || G.phase === 'done') {
      const w = weight();
      me.setBag(true, w / CAPACITY);
      if (G.phase === 'packing') K.setSpeed(w > CAPACITY ? 0.7 : 1);
    }
    // the tray: what is on the table or in the open container you are standing at
    let st = null;
    if (G.phase === 'packing' && K.room && K.room.id === GOBAG_ROOM) {
      let best = NEAR_STATION;
      stations().forEach((s) => {
        if (!s.open) return;
        const dx = Math.max(Math.abs(K.x - s.x) - s.w / 2, 0), dz = Math.max(Math.abs(K.z - s.z) - s.d / 2, 0), d = Math.hypot(dx, dz);
        if (d < best) { best = d; st = s; }
      });
    }
    // at a table or an open container, the camera rises over your left shoulder (Bayani walks on your right)
    // and looks down into it, so neither of you stands in the way of what is there
    if (st !== G.station) {
      if (st) K.setCamera(() => {
        const s = G.station || st;
        let fx = s.x - K.x, fz = s.z - K.z; const d = Math.hypot(fx, fz) || 1; fx /= d; fz /= d;
        const lx = fz, lz = -fx; // to your left as you face it
        // never through a wall: keep it inside the room
        const cx = Math.min(r.x1 - 0.35, Math.max(r.x0 + 0.35, K.x - fx * 1.25 + lx * 0.95)), cz = Math.min(r.z1 - 0.35, Math.max(r.z0 + 0.35, K.z - fz * 1.25 + lz * 0.95));
        return { x: cx, y: s.kind === 'table' ? 2.6 : 2.7, z: cz, lx: s.x, ly: s.look, lz: s.z };
      });
      else K.setCamera(null);
    }
    G.station = st;
    const key = st ? st.id + ':' + G.pieces.filter((p) => p.st === st && !p.packed).map((p) => p.def.id).join(',') : '';
    if (key !== G.trayKey) { G.trayKey = key; push(true); }
  }

  // ---------- telling the screen ----------
  function push() {
    const tray = G.station ? G.pieces.filter((p) => p.st === G.station && !p.packed).map((p) => ({ id: p.def.id, name: p.def.name, icon: p.def.icon })) : [];
    K.emit('gobag', {
      phase: G.phase, level: G.level, count: G.packed.length, weight: weight(), cap: CAPACITY,
      packed: G.packed.map((id) => { const d = L.byId(id); return { id, name: d.name, icon: d.icon, weight: d.weight }; }),
      tray, station: G.station ? G.station.name : null,
    });
  }

  // before the first round, the tables show a set of things to look at
  showSet(false); layout(L.buildRound(), 'easy');

  return {
    id: 'gobag',
    get phase() { return G.phase; },
    start, pack, unpack, finish, quit, look,
    setBest(best) { G.best = best; drawBoard(best); },
    update,
    // for tests: where each thing is
    debug() { return { phase: G.phase, level: G.level, tray: G.tray.map((d) => d.id), packed: G.packed.slice(), pieces: G.pieces.map((p) => { p.mesh.getWorldPosition(v); return { id: p.def.id, name: p.def.name, good: p.def.good, weight: p.def.weight, x: p.slot.x, z: p.slot.z, wx: v.x, wy: v.y, wz: v.z, st: p.st.id, open: !!p.st.open, packed: p.packed, hidden: p.item.hidden, visible: p.mesh.visible }; }), containers: containers.map((c) => ({ kind: c.kind, x: c.x, z: c.z + c.d / 2 + 0.72, open: !!c.open })) }; },
  };
}
