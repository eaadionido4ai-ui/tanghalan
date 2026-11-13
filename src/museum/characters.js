// Low-poly children for TANGHALAN: the player, and Bayani the guide, who is a hologram (makeHologram below).
// Each faces +z; legs and arms hang from pivots so they can swing while walking.
// The player can carry a go bag on the back (it fills up as things are packed) and hold something in
// front with both hands (the fire extinguisher), and reaches out when picking something up.

export function makeKid(T, o) {
  const g = new T.Group();
  const body = new T.Group();
  g.add(body);
  const skin = o.skin || 0xd69a63;
  // o.mat: another way to paint the parts (the hologram uses it); it gets each part's usual color
  const mat = o.mat || ((color, extra) => new T.MeshLambertMaterial(Object.assign({ color }, extra || {})));
  const add = (parent, geo, color, x, y, z, extra) => { const m = new T.Mesh(geo, mat(color, extra)); m.position.set(x || 0, y || 0, z || 0); parent.add(m); return m; };

  const legs = [-1, 1].map((s) => {
    const hip = new T.Group(); hip.position.set(0.09 * s, 0.48, 0); body.add(hip);
    add(hip, new T.CylinderGeometry(0.065, 0.06, 0.42, 10), skin, 0, -0.21, 0);
    add(hip, new T.BoxGeometry(0.13, 0.08, 0.2), 0x2b2b2b, 0, -0.43, 0.03);
    return hip;
  });
  add(body, new T.CylinderGeometry(0.17, 0.18, 0.2, 16), o.pants || 0x35506b, 0, 0.5, 0);
  add(body, new T.CylinderGeometry(0.16, 0.185, 0.42, 16), o.shirt, 0, 0.78, 0);
  const arms = [-1, 1].map((s) => {
    const shoulder = new T.Group(); shoulder.position.set(0.235 * s, 0.98, 0); body.add(shoulder);
    const arm = add(shoulder, new T.CylinderGeometry(0.055, 0.05, 0.42, 10), skin, 0, -0.2, 0);
    arm.rotation.z = 0.12 * s; arm.position.x = 0.02 * s;
    return shoulder;
  });
  add(body, new T.SphereGeometry(0.2, 20, 16), skin, 0, 1.18, 0);
  if (o.face) {
    add(body, new T.SphereGeometry(0.025, 8, 6), 0x2a2320, -0.07, 1.2, 0.185);
    add(body, new T.SphereGeometry(0.025, 8, 6), 0x2a2320, 0.07, 1.2, 0.185);
    add(body, new T.SphereGeometry(0.03, 8, 6), 0xf29a7a, -0.12, 1.13, 0.16);
    add(body, new T.SphereGeometry(0.03, 8, 6), 0xf29a7a, 0.12, 1.13, 0.16);
    const smile = add(body, new T.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), 0x2a2320, 0, 1.135, 0.19); smile.rotation.z = Math.PI;
  }
  if (o.hat) {
    add(body, new T.SphereGeometry(0.215, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xffc53d, 0, 1.24, 0);
    add(body, new T.CylinderGeometry(0.27, 0.27, 0.03, 24), 0xeaa100, 0, 1.25, 0.02);
  } else {
    const hair = add(body, new T.SphereGeometry(0.215, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), o.hair || 0x2b1d16, 0, 1.2, -0.015);
    hair.rotation.x = -0.35;
  }
  // a go bag on the back; its group is centered on the bag so it can swell as it fills
  const bag = new T.Group(); bag.position.set(0, 0.84, -0.22); body.add(bag);
  const bagColor = o.bag || 0xe2382b;
  add(bag, new T.BoxGeometry(0.3, 0.34, 0.14), bagColor, 0, 0, 0);
  add(bag, new T.BoxGeometry(0.26, 0.12, 0.05), 0xb8261b, 0, -0.1, -0.09);
  add(bag, new T.BoxGeometry(0.3, 0.05, 0.15), 0xb8261b, 0, 0.17, 0);
  add(body, new T.BoxGeometry(0.05, 0.36, 0.03), 0x7a1a12, -0.1, 0.84, -0.155).userData.strap = true;
  add(body, new T.BoxGeometry(0.05, 0.36, 0.03), 0x7a1a12, 0.1, 0.84, -0.155).userData.strap = true;
  const straps = body.children.filter((c) => c.userData.strap);
  const showBag = (on) => { bag.visible = on; straps.forEach((s) => { s.visible = on; }); };
  showBag(!!o.bag);
  if (o.cape) add(body, new T.CylinderGeometry(0.2, 0.3, 0.6, 16, 1, true, Math.PI * 0.6, Math.PI * 0.8), 0xf2760c, 0, 0.72, 0.01, { side: T.DoubleSide });
  if (o.star) {
    const s = new T.Shape();
    for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.035 : 0.085; if (i) s.lineTo(Math.cos(a) * r, Math.sin(a) * r); else s.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
    add(body, new T.ShapeGeometry(s), 0xffd24d, 0, 0.82, 0.18);
  }
  // where held things go: in front of the chest, between the hands
  const hands = new T.Group(); hands.position.set(0, 0.7, 0.27); body.add(hands);
  let holding = null, reachLeft = 0, holdStyle = 'front', waveLeft = 0;

  // a soft shadow on the floor (light casts none, so the hologram has no shadow)
  if (o.shadow !== false) {
    const shadow = new T.Mesh(new T.CircleGeometry(0.34, 24), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.026; shadow.renderOrder = 1; g.add(shadow);
  }

  return {
    group: g,
    // the parts that move, for the museum's other visitors (people.js): the body, and the hips and the shoulders
    // the legs and arms hang from (right first)
    body, legs, arms,
    hands,
    bag,
    // the go bag on the back: shown or not, and how full (0 empty, 1 full, more is over full)
    setBag(on, fill) { showBag(on); const k = 1 + Math.min(1.4, Math.max(0, fill || 0)) * 0.42; bag.scale.set(k, k, 1 + (k - 1) * 1.6); },
    hold(obj) { if (holding) hands.remove(holding); holding = obj || null; if (holding) hands.add(holding); },
    // 'side': carried by the handle in the right hand while walking; 'front': both hands, ready to use
    setHoldStyle(s) { holdStyle = s; },
    get holding() { return holding; },
    reach() { reachLeft = 0.5; },
    // wave hello for a few seconds
    wave(secs) { waveLeft = secs; },
    // phase advances with distance walked; amount 0..1 blends from standing to a full stride
    pose(phase, amount, t, dt) {
      const swing = Math.sin(phase) * 0.6 * amount;
      legs[0].rotation.x = swing; legs[1].rotation.x = -swing;
      arms[0].rotation.x = -swing * 0.9; arms[1].rotation.x = swing * 0.9;
      arms[0].rotation.z = 0; arms[1].rotation.z = 0;
      body.position.y = Math.abs(Math.cos(phase)) * 0.04 * amount;
      if (holding && holdStyle === 'side') { // the right arm carries it down at the side
        arms[0].rotation.x = swing * 0.25; arms[0].rotation.z = -0.14;
      } else if (holding) { // both hands in front, holding it
        arms[0].rotation.x = arms[1].rotation.x = -1.05 + swing * 0.08;
        arms[0].rotation.z = 0.3; arms[1].rotation.z = -0.3;
      } else if (reachLeft > 0) { // reaching out to pick something up, then pulling it in
        reachLeft = Math.max(0, reachLeft - (dt || 0.016));
        const k = Math.sin((1 - reachLeft / 0.5) * Math.PI);
        arms[1].rotation.x = -1.5 * k; arms[0].rotation.x = -0.4 * k;
      } else if (waveLeft > 0 && amount < 0.05) { // a wave hello
        waveLeft = Math.max(0, waveLeft - (dt || 0.016));
        arms[1].rotation.z = 2.4 + Math.sin(t * 6) * 0.25; arms[1].rotation.x = 0;
      }
    },
  };
}

// ---- Bayani, the hologram guide ----
// The same young hero (hard hat, cape, a star on his shirt), drawn in see-through light with fine lines moving up
// through him. He is built from the floor up when he appears (show: 0 gone .. 1 all there), hovers a little, and
// stands on a ring of light. Blue, with a deeper edge, so he reads against the museum's light walls.
const HOLO_VERT = `
varying vec3 vWorld;
varying vec3 vN;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const HOLO_FRAG = `
uniform float uTime;
uniform float uShow;
uniform float uAlpha;
uniform vec3 uColor;
varying vec3 vWorld;
varying vec3 vN;
void main() {
  float h = vWorld.y;
  float edge = uShow * 1.75;                       // built from the floor up
  if (h > edge) discard;
  vec3 v = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - abs(dot(normalize(vN), v)), 1.5);
  float lines = 0.8 + 0.2 * sin(h * 170.0 - uTime * 6.0);                        // fine lines drifting up
  float band = smoothstep(0.05, 0.0, abs(fract(h * 0.5 - uTime * 0.2) - 0.5));   // a soft band of light passing
  float lip = uShow < 0.999 ? smoothstep(0.08, 0.0, edge - h) : 0.0;             // the bright rim while he is built
  float feet = smoothstep(0.03, 0.45, h);                                        // his legs fade into the light
  float flick = 0.93 + 0.07 * sin(uTime * 41.0) * sin(uTime * 13.7);
  vec3 col = mix(uColor, vec3(0.92, 0.99, 1.0), clamp(band * 0.55 + lip, 0.0, 1.0));
  col = mix(col, uColor * 0.6, fres * 0.55);
  float a = uAlpha * (0.62 + 0.5 * fres) * lines * flick * feet + band * 0.14 * feet + lip * 0.7;
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * smoothstep(0.0, 0.12, uShow));
}`;

export function makeHologram(T) {
  const shared = { uTime: { value: 0 }, uShow: { value: 0 } };
  const KINDS = { body: [0x35c6f3, 0.58], deep: [0x1aa7de, 0.8], ink: [0x075c94, 0.96], bright: [0xf2fdff, 0.96] };
  // which light each of his parts is drawn in, by the color it has on a solid child
  const ROLE = { 0xe8ab70: 'body', 0x1f6f8b: 'body', 0x35506b: 'body', 0x2b2b2b: 'body', 0x2a2320: 'ink', 0xffc53d: 'deep', 0xeaa100: 'deep', 0xf2760c: 'deep', 0xffd24d: 'bright' };
  const made = {};
  const light = (kind, side) => {
    const key = kind + (side || '');
    if (!made[key]) {
      made[key] = new T.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uShow: shared.uShow, uColor: { value: new T.Color(KINDS[kind][0]) }, uAlpha: { value: KINDS[kind][1] } },
        vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, depthWrite: false, side: side || T.FrontSide,
      });
    }
    return made[key];
  };
  const unseen = new T.MeshBasicMaterial({ visible: false }); // rosy cheeks and the go bag are not part of him
  const kid = makeKid(T, {
    shirt: 0x1f6f8b, skin: 0xe8ab70, hat: true, face: true, cape: true, star: true, shadow: false,
    mat: (color, extra) => (ROLE[color] ? light(ROLE[color], extra && extra.side) : unseen),
  });
  // the light he stands on: a ring and a glow on the floor, and a faint beam rising around him
  const flat = (geo, color, opacity) => {
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide }));
    m.userData.full = opacity; return m;
  };
  const ring = flat(new T.RingGeometry(0.25, 0.32, 40), 0x2bb9ec, 0.9); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.024;
  const glow = flat(new T.CircleGeometry(0.25, 40), 0x9fe9ff, 0.4); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.022;
  const beam = flat(new T.CylinderGeometry(0.5, 0.22, 1.65, 28, 1, true), 0x3fcdf5, 0.1); beam.position.y = 0.83;
  const pad = new T.Group(); pad.add(glow, ring, beam);
  const group = new T.Group(); group.add(kid.group, pad); group.visible = false;

  return {
    group,
    // every mesh of his figure, for telling when someone taps him
    get meshes() { const out = []; kid.group.traverse((o) => { if (o.isMesh && o.material !== unseen) out.push(o); }); return out; },
    wave(secs) { kid.wave(secs); },
    // show: 0 gone .. 1 all there; t: the museum's clock in seconds
    update(show, t, dt) {
      shared.uTime.value = t; shared.uShow.value = show;
      group.visible = show > 0;
      kid.group.position.y = 0.05 + Math.sin(t * 1.7) * 0.02;
      const k = Math.min(1, show * 2.5);
      [ring, glow, beam].forEach((m) => { m.material.opacity = m.userData.full * k; });
      ring.rotation.z = t * 0.6;
      kid.pose(0, 0, t, dt);
    },
  };
}
