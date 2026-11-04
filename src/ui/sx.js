// sx('display:flex;gap:8px') -> { display: 'flex', gap: '8px' }
// Lets the screens keep the design's inline CSS almost verbatim. Results are cached.

const cache = new Map();

function split(css) {
  const out = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (quote) { if (c === quote) quote = null; continue; }
    if (c === '"' || c === "'") quote = c;
    else if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ';' && depth === 0) { out.push(css.slice(start, i)); start = i + 1; }
  }
  out.push(css.slice(start));
  return out;
}

export function sx(css) {
  let o = cache.get(css);
  if (o) return o;
  o = {};
  for (const decl of split(css)) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    o[key] = val;
  }
  if (cache.size > 4000) cache.clear();
  cache.set(css, o);
  return o;
}

// Props for a button with the design's style-active pressed state.
// <button {...pr('background:#d9650a;box-shadow:0 6px 0 #a34a05', 'transform:translateY(4px);box-shadow:0 2px 0 #a34a05')}>
export function pr(css, active) {
  const style = { ...sx(css) };
  if (!active) return { style };
  const a = sx(active);
  if (a.transform) style['--pt'] = a.transform;
  if (a.boxShadow) { style['--ps'] = a.boxShadow; return { className: 'pr', style }; }
  return { className: 'pt', style };
}
