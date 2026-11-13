// The museum's other visitors on screen (visitors.js says where they are and what they do): the children are the
// player's kind (makeKid, in characters.js), in school uniform; their teacher is a grown-up drawn the same way.
// Each person is baked into five meshes, so a phone draws a handful of things per person instead of dozens: the
// body, and the two legs and two arms, which still swing at the hips and the shoulders.
//
// In each figure's own space x points to its left, y up and z forward (it faces +z), as the player's.
import { makeKid } from './characters.js';

// a child in school uniform: the girls in a skirt, with long hair or pigtails
function makeChild(T, o) {
  const k = makeKid(T, { shirt: o.shirt, pants: o.pants, hair: o.hair, skin: o.skin, face: true, bag: o.bag });
  const add = (geo, color, x, y, z) => { const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color })); m.position.set(x, y, z); k.body.add(m); return m; };
  if (o.girl) add(new T.CylinderGeometry(0.175, 0.25, 0.24, 16), o.pants, 0, 0.47, 0);
  if (o.girl === 'long') add(new T.BoxGeometry(0.3, 0.32, 0.07), o.hair, 0, 1.07, -0.15);
  if (o.girl === 'pigtails') [-1, 1].forEach((s) => add(new T.SphereGeometry(0.075, 10, 8), o.hair, 0.2 * s, 1.12, -0.07));
  return { group: k.group, body: k.body, legs: k.legs, arms: k.arms };
}

// a grown-up in the children's style: longer legs, a smaller head; a teacher has an ID on a lanyard
function makeAdult(T, o) {
  const g = new T.Group(), body = new T.Group();
  g.add(body);
  const skin = o.skin || 0xc68a55;
  const add = (parent, geo, color, x, y, z) => { const m = new T.Mesh(geo, new T.MeshLambertMaterial({ color })); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; };
  const HIP = 0.76, SH = 1.28, HEAD = SH + 0.22;
  const legs = [-1, 1].map((s) => {
    const hip = new T.Group(); hip.position.set(0.095 * s, HIP, 0); body.add(hip);
    add(hip, new T.CylinderGeometry(0.075, 0.062, 0.7, 10), o.pants, 0, -0.35, 0);
    add(hip, new T.BoxGeometry(0.13, 0.08, 0.24), 0x2b2b2b, 0, -0.72, 0.04);
    return hip;
  });
  add(body, new T.CylinderGeometry(0.18, 0.19, 0.2, 16), o.pants, 0, HIP + 0.05, 0);
  add(body, new T.CylinderGeometry(0.165, 0.19, 0.48, 16), o.shirt, 0, HIP + 0.34, 0);
  const arms = [-1, 1].map((s) => {
    const shoulder = new T.Group(); shoulder.position.set(0.225 * s, SH, 0); body.add(shoulder);
    const arm = new T.Group(); arm.rotation.z = 0.08 * s; arm.position.x = 0.015 * s; shoulder.add(arm);
    add(arm, new T.CylinderGeometry(0.062, 0.058, 0.22, 10), o.shirt, 0, -0.1, 0);   // the sleeve
    add(arm, new T.CylinderGeometry(0.05, 0.045, 0.32, 10), skin, 0, -0.36, 0);      // the forearm
    add(arm, new T.SphereGeometry(0.052, 10, 8), skin, 0, -0.54, 0);                 // the hand
    return shoulder;
  });
  add(body, new T.CylinderGeometry(0.055, 0.06, 0.1, 10), skin, 0, SH + 0.07, 0);   // the neck
  add(body, new T.SphereGeometry(0.155, 20, 16), skin, 0, HEAD, 0);
  add(body, new T.SphereGeometry(0.02, 8, 6), 0x2a2320, -0.052, HEAD + 0.02, 0.143);
  add(body, new T.SphereGeometry(0.02, 8, 6), 0x2a2320, 0.052, HEAD + 0.02, 0.143);
  add(body, new T.SphereGeometry(0.024, 8, 6), 0xf29a7a, -0.09, HEAD - 0.035, 0.122);
  add(body, new T.SphereGeometry(0.024, 8, 6), 0xf29a7a, 0.09, HEAD - 0.035, 0.122);
  const smile = add(body, new T.TorusGeometry(0.04, 0.01, 6, 12, Math.PI), 0x2a2320, 0, HEAD - 0.03, 0.148); smile.rotation.z = Math.PI;
  const hair = add(body, new T.SphereGeometry(0.165, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), o.hair, 0, HEAD + 0.015, -0.012); hair.rotation.x = -0.35;
  if (o.bun) add(body, new T.SphereGeometry(0.075, 12, 10), o.hair, 0, HEAD + 0.04, -0.16);
  if (o.lanyard) {
    [-1, 1].forEach((s) => { const m = add(body, new T.BoxGeometry(0.025, 0.3, 0.01), o.lanyard, 0.06 * s, SH - 0.06, 0.168); m.rotation.z = 0.22 * s; });
    add(body, new T.BoxGeometry(0.085, 0.11, 0.012), 0xffffff, 0, SH - 0.24, 0.182);
    add(body, new T.BoxGeometry(0.085, 0.025, 0.014), o.lanyard, 0, SH - 0.2, 0.183);
  }
  return { group: g, body, legs, arms };
}

// one mesh, colored by its vertices, from all the meshes under root (not going into the parts in skip)
function bakeInto(T, root, skip, material) {
  const meshes = [];
  const walk = (o) => {
    if (!o.visible || (o !== root && skip.indexOf(o) >= 0)) return;
    if (o.isMesh) meshes.push(o);
    o.children.forEach(walk);
  };
  walk(root);
  const inv = new T.Matrix4().copy(root.matrixWorld).invert(), rel = new T.Matrix4();
  const parts = meshes.map((m) => {
    const geo = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    geo.applyMatrix4(rel.multiplyMatrices(inv, m.matrixWorld));
    return { geo, color: m.material.color };
  });
  const count = parts.reduce((n, p) => n + p.geo.attributes.position.count, 0);
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let at = 0;
  parts.forEach(({ geo, color }) => {
    const n = geo.attributes.position.count;
    pos.set(geo.attributes.position.array, at * 3);
    nor.set(geo.attributes.normal.array, at * 3);
    for (let k = 0; k < n; k++) { col[(at + k) * 3] = color.r; col[(at + k) * 3 + 1] = color.g; col[(at + k) * 3 + 2] = color.b; }
    at += n;
    geo.dispose();
  });
  // the pieces it was made of go
  meshes.forEach((m) => { m.parent.remove(m); m.geometry.dispose(); m.material.dispose(); });
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new T.BufferAttribute(nor, 3));
  geo.setAttribute('color', new T.BufferAttribute(col, 3));
  const mesh = new T.Mesh(geo, material);
  root.add(mesh);
  return mesh;
}

// who: a person from visitors.js ({ adult, look })
export function makePerson(T, who) {
  const f = who.adult ? makeAdult(T, who.look) : makeChild(T, who.look);
  // a figure's own material, so it can fade when it comes between the camera and you
  const material = new T.MeshLambertMaterial({ vertexColors: true, transparent: true });
  // makeKid's soft shadow stays as it is; a grown-up gets one too
  let shadow = f.group.children.find((c) => c.isMesh && c.material.transparent);
  if (!shadow) {
    shadow = new T.Mesh(new T.CircleGeometry(0.36, 24), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.026; shadow.renderOrder = 1; f.group.add(shadow);
  }
  f.group.updateMatrixWorld(true);
  const limbs = f.legs.concat(f.arms);
  limbs.forEach((limb) => bakeInto(T, limb, [], material));
  bakeInto(T, f.body, limbs, material);
  return {
    group: f.group, body: f.body, legs: f.legs, arms: f.arms, shadow, material,
    adult: !!who.adult, seed: Math.random() * 10, alpha: 1,
    phase: 0, stride: 0, j: { legR: 0, legL: 0, armRx: 0, armRz: 0, armLx: 0, armLz: 0, twist: 0, lean: 0 },
  };
}

// What a person does (act: stand, walk, look, point, talk, wave), and how far they moved this frame (m). The legs
// and arms swing with the distance walked, as the player's do; the rest eases from one pose into the next.
// (Signs, for the figure facing +z: turning a leg or an arm forward is negative about x; its right side is -x, so
// raising the right arm out to the side is negative about z, and the left arm's positive.)
export function posePerson(f, act, moved, t, dt) {
  f.phase += moved * 4.2;
  const speed = moved / Math.max(dt, 1e-3);
  f.stride += (Math.min(1, speed / 0.9) - f.stride) * Math.min(1, dt * 8);
  const w = { legR: 0, legL: 0, armRx: 0, armRz: 0, armLx: 0, armLz: 0, twist: 0, lean: 0 };
  const tt = t + f.seed;
  if (act === 'look') {
    w.lean = -0.04;
    if (f.adult) { w.armRx = w.armLx = -0.5; w.armRz = 0.24; w.armLz = -0.24; } // hands together in front
    else { w.armRx = w.armLx = 0.28; w.armRz = 0.14; w.armLz = -0.14; }          // hands behind the back
  } else if (act === 'point') {
    w.lean = -0.06; w.armRx = -1.95; w.armRz = -0.1; w.armLx = 0.15;
  } else if (act === 'talk') {
    w.twist = 0.12 * Math.sin(tt * 0.9);
    w.armRx = -0.85 + 0.28 * Math.sin(tt * 3.1); w.armRz = -0.2;
    w.armLx = -0.5 + 0.17 * Math.sin(tt * 2.3 + 1); w.armLz = 0.14;
  } else if (act === 'wave') {
    w.armRz = -(2.6 + 0.28 * Math.sin(tt * 9)); w.armRx = -0.2;
  } else {
    w.lean = 0.02 * Math.sin(tt * 1.3);
  }
  const swing = Math.sin(f.phase) * 0.6 * f.stride;
  w.legR += swing; w.legL -= swing;
  if (act === 'walk' || act === 'stand') { w.armRx -= swing * 0.9; w.armLx += swing * 0.9; }
  const k = 1 - Math.exp(-dt * 10);
  for (const key in w) f.j[key] += (w[key] - f.j[key]) * k;
  f.legs[0].rotation.x = f.j.legR; f.legs[1].rotation.x = f.j.legL;
  f.arms[0].rotation.set(f.j.armRx, 0, f.j.armRz); f.arms[1].rotation.set(f.j.armLx, 0, f.j.armLz);
  f.body.rotation.set(f.j.lean, f.j.twist, 0);
  f.body.position.y = Math.abs(Math.cos(f.phase)) * 0.04 * f.stride;
}

// Fades a person who comes between the camera and you (or right in front of the camera), so they never hide you.
// cam: the camera's position; me: where your head is ({ x, y, z }); follow: false when a game or a test holds the
// camera somewhere else (then nobody fades).
export function fadePerson(f, cam, me, follow = true) {
  const p = f.group.position;
  const vx = me.x - cam.x, vy = me.y - cam.y, vz = me.z - cam.z, l2 = vx * vx + vy * vy + vz * vz;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((p.x - cam.x) * vx + (0.8 - cam.y) * vy + (p.z - cam.z) * vz) / l2)) : 0;
  const d = Math.hypot(cam.x + vx * t - p.x, cam.y + vy * t - 0.8, cam.z + vz * t - p.z);
  const close = Math.hypot(p.x - cam.x, p.z - cam.z);
  const want = !follow ? 1 : close < 1.0 ? 0.15 : d < 0.55 && t < 0.92 ? 0.25 : 1;
  f.alpha += (want - f.alpha) * 0.2;
  if (Math.abs(f.alpha - 1) < 0.01) f.alpha = 1;
  f.material.opacity = f.alpha;
  f.material.depthWrite = f.alpha > 0.95;
  f.shadow.material.opacity = 0.2 * f.alpha;
}

export function disposePerson(f) {
  f.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  f.material.dispose(); f.shadow.material.dispose();
}
