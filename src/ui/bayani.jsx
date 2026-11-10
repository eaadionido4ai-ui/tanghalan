import { sx } from './sx.js';

// Bayani, the guide, as a hologram: the same young hero (hard hat, cape, a star on his shirt) drawn in see-through
// light with fine lines running through him. He is shown on a dark pad, because light only reads on dark, and he
// is small and quiet until someone calls him. His 3D self is in src/museum/characters.js (makeHologram).

const C = '#5ce1ff', HI = '#bff4ff', WH = '#e8fbff', INK = '#0b1d2b';
export const HOLO_CARD = 'background:rgba(11,29,43,.96);border:1.5px solid rgba(92,225,255,.55);border-radius:20px;color:#e8fbff;box-shadow:0 0 22px rgba(92,225,255,.16),0 8px 20px rgba(8,20,30,.3)';
export const HOLO_LABEL = 'font-weight:900;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#5ce1ff';
export const HOLO_BTN = 'min-height:44px;border-radius:999px;border:1.5px solid rgba(92,225,255,.7);color:#bff4ff;padding:0 14px;font-weight:800;font-size:13.5px;display:flex;align-items:center;gap:6px';
export const HOLO_BTN_ON = 'min-height:44px;border-radius:999px;background:#5ce1ff;color:#0b1d2b;padding:0 18px;font-weight:900;font-size:13.5px';
const LINES = Array.from({ length: 22 }, (_, i) => 17 + i * 3);

// The figure itself, in a 72 x 100 box: head at the top, the ring of light he stands on at the bottom.
function Figure({ beam, wave, still }) {
  const arm = { x: 47, y: 45, width: 7, height: 18, rx: 3.5, fill: C, opacity: 0.38 };
  if (wave) arm.style = { transformBox: 'fill-box', transformOrigin: '50% 10%', animation: 'bh-wave 1.1s ease-in-out infinite' };
  return (
    <>
      {beam && <polygon points="24,92 48,92 68,6 4,6" fill={C} opacity="0.07" />}
      {beam && <ellipse cx="36" cy="92" rx="22" ry="5" fill={C} opacity="0.22" />}
      <g style={still ? undefined : { animation: 'holo-flicker 4.6s steps(1) infinite' }}>
        <path d="M24 42 L48 42 L52 76 L20 76 Z" fill={C} opacity="0.2" />
        <rect x="18" y="45" width="7" height="18" rx="3.5" fill={C} opacity="0.38" />
        <rect {...arm} />
        <rect x="28" y="67" width="7" height="15" rx="3" fill={C} opacity="0.32" />
        <rect x="37" y="67" width="7" height="15" rx="3" fill={C} opacity="0.32" />
        <rect x="24" y="43" width="24" height="26" rx="8" fill={C} opacity="0.45" stroke="#9eefff" strokeWidth="0.8" />
        <polygon points="36,47 38.2,52 43.6,52.4 39.4,55.9 40.8,61.2 36,58.2 31.2,61.2 32.6,55.9 28.4,52.4 33.8,52" fill={WH} opacity="0.9" />
        <circle cx="36" cy="30" r="13" fill={C} opacity="0.4" stroke="#9eefff" strokeWidth="0.8" />
        <path d="M23 29 a13 13 0 0 1 26 0 v-3 a13 13 0 0 0 -26 0 Z" fill={C} opacity="0.6" />
        <path d="M21 24 a15 10 0 0 1 30 0 Z" fill={HI} opacity="0.75" />
        <rect x="19" y="22" width="34" height="4.5" rx="2.25" fill={HI} opacity="0.85" />
        <circle cx="31" cy="31" r="1.9" fill={WH} />
        <circle cx="41" cy="31" r="1.9" fill={WH} />
        <path d="M31 36 q5 4 10 0" fill="none" stroke={WH} strokeWidth="1.8" strokeLinecap="round" />
        <g opacity="0.35" fill={INK}>{LINES.map((y) => <rect key={y} x="14" y={y} width="44" height="0.7" />)}</g>
        <rect x="21" y="52" width="30" height="1.1" fill={WH} opacity="0.45" style={still ? undefined : { animation: 'holo-sweep 3.4s linear infinite' }} />
      </g>
      {beam && <ellipse cx="36" cy="92" rx="12" ry="2.6" fill={WH} opacity="0.85" />}
      {beam && <rect x="20" y="93" width="32" height="5" rx="2.5" fill="#1d3a4f" stroke={C} strokeWidth="0.6" />}
    </>
  );
}

// All of him. size is the width; pad puts him on his own dark tile, for light pages.
export function HoloBayani({ size = 72, pad = false, wave = false, still = false, appear = false }) {
  const fig = (
    <svg width={size} height={Math.round(size * 100 / 72)} viewBox="0 0 72 100" aria-hidden="true" style={{ display: 'block', overflow: 'visible', animation: appear ? 'holo-in .55s ease-out both' : 'none' }}>
      <Figure beam wave={wave} still={still} />
    </svg>
  );
  if (!pad) return fig;
  return <span style={sx('display:block;background:#0b1d2b;border:1.5px solid rgba(92,225,255,.45);border-radius:16px;padding:6px 7px 4px;overflow:hidden')}>{fig}</span>;
}

// Just his head and hard hat, for the round button and the small pictures beside what he says.
export function HoloFace({ size = 40 }) {
  return <svg width={size} height={size} viewBox="16 9 40 40" aria-hidden="true" style={{ display: 'block' }}><Figure still /></svg>;
}

// The round, softly glowing button that calls him.
export function BayaniChip({ onClick, size = 56, label = 'Call Bayani for help', open, style }) {
  return (
    <button onClick={onClick} aria-label={label} aria-expanded={open} data-bayani=""
      style={{ ...sx('border-radius:50%;background:#0b1d2b;border:2px solid rgba(92,225,255,.7);display:flex;align-items:center;justify-content:center;flex:none;overflow:hidden;animation:holo-glow 3.2s ease-in-out infinite'), width: size, height: size, ...(style || {}) }}>
      <HoloFace size={Math.round(size * 0.8)} />
    </button>
  );
}

// Something Bayani says inside a sheet: him on his pad, and his words in a card of the same light.
export function BayaniTip({ label = "Bayani's tip", children, extra }) {
  return (
    <div style={sx('display:flex;align-items:flex-end;gap:10px')}>
      <span style={sx('flex:none')}><HoloBayani size={46} pad /></span>
      <div style={sx(HOLO_CARD + ';flex:1;min-width:0;border-radius:20px 20px 20px 6px;padding:12px 14px;display:flex;flex-direction:column;gap:9px;box-shadow:none')}>
        <div style={sx('font-weight:800;font-size:14.5px;line-height:1.45')}><b style={sx(HOLO_LABEL + ';display:block;margin-bottom:3px')}>{label}</b>{children}</div>
        {extra}
      </div>
    </div>
  );
}
