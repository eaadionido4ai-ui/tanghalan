// Small sounds made on the spot with the Web Audio API (no sound files, so the app stays light and offline):
// a pop when you pick something up, a zip, the fire alarm, the extinguisher's hiss, a cheer of notes.
// Nothing plays when Sound is off in Settings.

let ctx = null, on = true, hiss = null;
const audio = () => {
  if (!on) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch (e) { return null; }
};
function tone(freq, t0, len, type, vol) {
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime + t0);
  g.gain.exponentialRampToValueAtTime(vol || 0.18, a.currentTime + t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + len);
  o.connect(g); g.connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + len + 0.05);
}
function noise(len, vol, from, to) {
  const a = audio(); if (!a) return null;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * len)), a.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = from || 2400; f.Q.value = 0.7;
  if (to) f.frequency.exponentialRampToValueAtTime(to, a.currentTime + len);
  const g = a.createGain(); g.gain.value = vol || 0.12;
  src.connect(f); f.connect(g); g.connect(a.destination);
  return { src, g, a };
}

export const sfx = {
  setOn(v) { on = !!v; if (!on) this.hiss(false); },
  pop() { tone(520, 0, 0.12, 'triangle', 0.16); tone(880, 0.07, 0.14, 'triangle', 0.12); },
  drop() { tone(330, 0, 0.14, 'triangle', 0.14); },
  zip() { const n = noise(0.45, 0.09, 1200, 5200); if (n) n.src.start(); },
  open() { tone(240, 0, 0.18, 'square', 0.05); tone(180, 0.08, 0.2, 'square', 0.04); },
  click() { tone(1400, 0, 0.05, 'square', 0.06); },
  alarm() { for (let i = 0; i < 6; i++) { tone(960, i * 0.32, 0.16, 'square', 0.07); tone(760, i * 0.32 + 0.16, 0.16, 'square', 0.07); } },
  cheer() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.14)); },
  sad() { tone(330, 0, 0.3, 'sine', 0.12); tone(262, 0.25, 0.45, 'sine', 0.12); },
  // the extinguisher's spray, on while you squeeze
  hiss(start) {
    if (start && !hiss) {
      const n = noise(2, 0.1, 3000);
      if (!n) return;
      n.src.loop = true; n.src.start(); hiss = n;
    } else if (!start && hiss) {
      try { hiss.g.gain.exponentialRampToValueAtTime(0.0001, hiss.a.currentTime + 0.15); hiss.src.stop(hiss.a.currentTime + 0.2); } catch (e) { /* stopped */ }
      hiss = null;
    }
  },
};
