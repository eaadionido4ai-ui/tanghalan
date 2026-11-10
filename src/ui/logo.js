// The TANGHALAN logo (H4, "Mata"): the typhoon symbol turned into an eye, with the museum's 3D room at its center.
// It is kept in one file, src/assets/logo.svg, and drawn from there two ways: as an inline SVG on the screens
// (Logo in art.jsx) and onto a canvas for the signs and the rug in the 3D museum (drawLogo). The app icons in
// public/ are made from the same file by pwa/make_icons.py.
import raw from '../assets/logo.svg?raw';

// what is inside the <svg> tag, without the comment
export const LOGO_INNER = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').trim();

const nums = (text) => (text || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);

// transform="translate(50 51) scale(0.49) matrix(1,-0.5625,0,1,18,68)" -> [[a, b, c, d, e, f], ...]
function transforms(text) {
  const out = [];
  (text || '').replace(/(matrix|translate|scale)\(([^)]*)\)/g, (_, kind, args) => {
    const n = nums(args);
    if (kind === 'matrix') out.push(n);
    else if (kind === 'translate') out.push([1, 0, 0, 1, n[0], n[1] || 0]);
    else out.push([n[0], 0, 0, n.length > 1 ? n[1] : n[0], 0, 0]);
    return '';
  });
  return out;
}

function pathOf(el) {
  const a = (k) => parseFloat(el.getAttribute(k) || 0);
  const p = new Path2D();
  switch (el.tagName) {
    case 'path': return new Path2D(el.getAttribute('d'));
    case 'circle': p.arc(a('cx'), a('cy'), a('r'), 0, Math.PI * 2); return p;
    case 'rect': {
      const x = a('x'), y = a('y'), w = a('width'), h = a('height'), r = Math.min(a('rx'), w / 2, h / 2);
      if (!r) { p.rect(x, y, w, h); return p; }
      p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath();
      return p;
    }
    case 'polygon': case 'polyline': {
      const n = nums(el.getAttribute('points'));
      for (let i = 0; i + 1 < n.length; i += 2) { if (i) p.lineTo(n[i], n[i + 1]); else p.moveTo(n[i], n[i + 1]); }
      if (el.tagName === 'polygon') p.closePath();
      return p;
    }
    default: return null;
  }
}

const STYLE = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];
let shapes = null;
function parse() {
  const out = [];
  const walk = (el, t0, st0) => {
    for (const ch of Array.from(el.children)) {
      const t = t0.concat(transforms(ch.getAttribute('transform')));
      const st = { ...st0 };
      STYLE.forEach((k) => { const v = ch.getAttribute(k); if (v != null) st[k] = v; });
      if (ch.tagName === 'g') { walk(ch, t, st); continue; }
      const path = pathOf(ch);
      if (path) out.push({ path, t, st });
    }
  };
  walk(new DOMParser().parseFromString(raw, 'image/svg+xml').documentElement, [], { fill: '#000' });
  return out;
}

// Draws the logo on a canvas, s pixels wide, with its top left corner at (x, y).
export function drawLogo(c, x, y, s) {
  if (!shapes) shapes = parse();
  c.save(); c.translate(x, y); c.scale(s / 100, s / 100);
  shapes.forEach(({ path, t, st }) => {
    c.save();
    t.forEach((m) => c.transform(m[0], m[1], m[2], m[3], m[4], m[5]));
    if (st.fill && st.fill !== 'none') { c.fillStyle = st.fill; c.fill(path); }
    if (st.stroke && st.stroke !== 'none') {
      c.strokeStyle = st.stroke; c.lineWidth = parseFloat(st['stroke-width'] || 1);
      c.lineCap = st['stroke-linecap'] || 'butt'; c.lineJoin = st['stroke-linejoin'] || 'miter';
      c.stroke(path);
    }
    c.restore();
  });
  c.restore();
}
