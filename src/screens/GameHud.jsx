import { useEffect, useRef } from 'react';
import { sx, pr } from '../ui/sx.js';
import { Mascot, Confetti } from '../ui/art.jsx';
import { GAMES } from '../museum/content.js';

// What you see on screen while you play in the two game rooms: the go bag bar and the tray of things at a
// table, the card for one thing, your bag, the fire meters and the PASS controls, the level choice and the
// results. The 3D side is src/rooms/gobag.js and src/rooms/fire.js.

const PILL = 'background:rgba(14,34,51,.86);border:1px solid rgba(255,255,255,.18);border-radius:16px;color:#fff';
const CARD = 'background:#fff;border-radius:22px;padding:15px 16px;display:flex;flex-direction:column;gap:10px';
const H2 = "font:800 24px/1.1 'Baloo 2',sans-serif;padding-top:3px";
const BIG = (bg, sh) => pr("background:" + bg + ";color:#fff;font:800 19px 'Baloo 2',sans-serif;padding:12px 20px 9px;border-radius:999px;box-shadow:0 5px 0 " + sh, 'transform:translateY(3px);box-shadow:0 2px 0 ' + sh);
const SOFT = 'background:#fff;border:2px solid #d5e3ea;box-shadow:0 4px 0 #d5e3ea;border-radius:999px;padding:11px 16px;font-weight:900;font-size:15px;color:#16303f';

export const Stars = ({ n, size = 34 }) => (
  <div aria-label={n + ' of 3 stars'} style={sx('display:flex;gap:6px;justify-content:center')}>
    {[0, 1, 2].map((i) => <span key={i} style={{ fontSize: size, lineHeight: 1, color: i < n ? '#eaa100' : '#d5e3ea', animation: i < n ? 'bh-pop .5s ' + (0.15 + i * 0.15) + 's both' : 'none' }}>★</span>)}
  </div>
);

function Meter({ value, max = 100, color, back = 'rgba(255,255,255,.22)', h = 10 }) {
  return (
    <span style={{ ...sx('display:block;flex:1;min-width:46px;border-radius:999px;overflow:hidden'), height: h, background: back }}>
      <span style={{ ...sx('display:block;height:100%;border-radius:999px;transition:width .15s'), width: Math.max(0, Math.min(100, (value / max) * 100)) + '%', background: color }} />
    </span>
  );
}

// ---------- the go bag ----------
export function GoBagBar({ gb, onBag, onZip }) {
  const over = gb.weight > gb.cap;
  return (
    <div style={sx(PILL + ';display:flex;align-items:center;gap:7px;padding:7px 7px 7px 12px;pointer-events:auto;max-width:100%')}>
      <span style={sx('display:flex;flex-direction:column;gap:4px;flex:1;min-width:0')}>
        <span style={sx('font-weight:900;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis')}>🎒 {gb.count} packed</span>
        <span style={sx('display:flex;align-items:center;gap:6px')}>
          <Meter value={gb.weight} max={gb.cap} color={over ? 'linear-gradient(90deg,#f2760c,#e2382b)' : 'linear-gradient(90deg,#3ee39b,#1aa46a)'} />
          <b aria-label={'Weight ' + gb.weight + ' of ' + gb.cap + (over ? ', too heavy' : '')} style={{ ...sx('flex:none;font-size:11.5px;font-weight:900'), color: over ? '#ffb38a' : '#bfe9d4' }}>{over ? '⚠️ ' : ''}{gb.weight}/{gb.cap}</b>
        </span>
      </span>
      <button onClick={onBag} style={sx('flex:none;background:rgba(255,255,255,.14);border-radius:12px;padding:8px 9px;font-weight:900;font-size:13px;color:#fff')}>👀 Bag</button>
      <button onClick={onZip} style={sx('flex:none;background:#1aa46a;border-radius:12px;padding:8px 9px;font-weight:900;font-size:13px;color:#fff;box-shadow:0 3px 0 #0c7a4a')}>🤐 Zip it</button>
    </div>
  );
}

export function Tray({ gb, onLook }) {
  if (!gb.tray || !gb.tray.length) return null;
  return (
    <div style={sx('display:flex;flex-direction:column;gap:6px;pointer-events:auto;animation:bh-up .2s ease-out both')}>
      <span style={sx('align-self:flex-start;' + PILL + ';padding:4px 12px;font-size:12px;font-weight:900')}>{gb.level === 'hard' ? 'In' : 'On'} {gb.station}: tap one to look</span>
      <div className="hscroll" style={sx('display:flex;gap:8px;padding-bottom:2px')}>
        {gb.tray.map((t) => (
          <button key={t.id} onClick={() => onLook(t.id)} {...pr('flex:none;width:78px;display:flex;flex-direction:column;align-items:center;gap:2px;background:#fff;border-radius:16px;padding:8px 4px 7px;box-shadow:0 4px 0 rgba(0,0,0,.25)', 'transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.25)')}>
            <span style={sx('font-size:28px;line-height:1.1')}>{t.icon}</span>
            <span style={sx('font-size:11px;font-weight:900;line-height:1.15;color:#16303f;text-align:center')}>{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LookCard({ it, onPack, onLeave }) {
  return (
    <div style={sx('position:absolute;inset:0;z-index:28;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(8,20,30,.55);animation:bh-fade .15s both')} onClick={onLeave}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-label={it.name} style={sx(CARD + ';width:min(360px,100%);align-items:center;text-align:center;animation:bh-up .2s ease-out both')}>
        <span style={sx('font-size:64px;line-height:1')}>{it.icon}</span>
        <div style={sx(H2)}>{it.name}</div>
        <p style={sx('margin:0;font-weight:700;font-size:15.5px;line-height:1.5;color:#25404e')}>{it.info}</p>
        <span style={sx('font-size:12.5px;font-weight:900;color:#4f6572;background:#eef3f6;border-radius:999px;padding:4px 10px')}>Weight: {it.weight} {it.weight === 1 ? 'unit' : 'units'}</span>
        <div style={sx('display:flex;gap:10px;width:100%;margin-top:4px')}>
          <button onClick={onLeave} style={sx(SOFT + ';flex:1')}>{it.packed ? 'Keep it' : 'Leave it'}</button>
          <button onClick={onPack} {...BIG(it.packed ? '#4f6572' : '#1aa46a', it.packed ? '#33444d' : '#0c7a4a')} style={{ ...BIG(it.packed ? '#4f6572' : '#1aa46a', it.packed ? '#33444d' : '#0c7a4a').style, flex: 1 }}>{it.packed ? 'Take it out' : '🎒 Pack it'}</button>
        </div>
      </div>
    </div>
  );
}

export function BagSheet({ gb, Sheet, onUnpack, onClose, onZip, onQuit }) {
  const over = gb.weight > gb.cap;
  return (
    <Sheet onClose={onClose} title="🎒 Your go bag" sub={gb.count + ' packed · weight ' + gb.weight + ' of ' + gb.cap}>
      <div style={sx(CARD)}>
        <Meter value={gb.weight} max={gb.cap} h={14} back="#eef3f6" color={over ? 'linear-gradient(90deg,#f2760c,#e2382b)' : 'linear-gradient(90deg,#3ee39b,#1aa46a)'} />
        {over && <span style={sx('font-weight:800;font-size:14px;color:#a84d04')}>Your bag is getting heavy. Pick what matters most.</span>}
        {!gb.packed.length && <span style={sx('font-weight:700;font-size:15px;color:#4f6572')}>{gb.level === 'hard' ? 'Nothing packed yet. Open the cabinet, the drawers, the crate or the cooler, then tap a thing to look at it.' : 'Nothing packed yet. Walk to a table and tap a thing to look at it.'}</span>}
        {gb.packed.map((p) => (
          <div key={p.id} style={sx('display:flex;align-items:center;gap:12px;padding:6px 0;border-top:1px solid #eef2f4')}>
            <span style={sx('font-size:28px;width:40px;text-align:center')}>{p.icon}</span>
            <span style={sx('flex:1;font-weight:900;font-size:15px')}>{p.name}<span style={sx('display:block;font-weight:700;font-size:12px;color:#4f6572')}>Weight {p.weight}</span></span>
            <button onClick={() => onUnpack(p.id)} aria-label={'Take out ' + p.name} style={sx('font-weight:900;font-size:13px;background:#eef3f6;border-radius:999px;padding:7px 12px;color:#16303f')}>Take out</button>
          </div>
        ))}
      </div>
      <button onClick={onZip} {...BIG('#1aa46a', '#0c7a4a')}>🤐 Zip it up and finish</button>
      <button onClick={onQuit} style={sx(SOFT + ';align-self:center')}>Stop this round</button>
    </Sheet>
  );
}

// ---------- the fire ----------
const CHIPS = [['pull', 'P', 'Pull'], ['aim', 'A', 'Aim'], ['squeeze', 'S', 'Squeeze'], ['sweep', 'S', 'Sweep']];
export function FireBar({ fx }) {
  return (
    <div style={sx(PILL + ';display:flex;flex-direction:column;gap:6px;padding:8px 12px;min-width:min(330px,100%);pointer-events:auto')}>
      <div style={sx('display:flex;align-items:center;gap:8px;font-weight:900;font-size:12.5px')}>
        <span style={sx('white-space:nowrap')}>🔥 Fire</span>
        <Meter value={fx.intensity} color="linear-gradient(90deg,#ffc53d,#e2382b)" />
        {fx.level === 'hard' && <><span style={sx('white-space:nowrap')}>🧯</span><Meter value={fx.agent} color="linear-gradient(90deg,#9fd3ff,#2f74d0)" /></>}
        {fx.secs > 0 && <span style={sx('white-space:nowrap;color:#ffd873')}>⏱ {fx.secs}s</span>}
      </div>
      <div style={sx('display:flex;gap:5px;align-items:center;flex-wrap:wrap')}>
        <span title={fx.alarm ? 'The alarm is on' : 'Press the alarm by the door'} style={{ ...sx('font-size:11.5px;font-weight:900;border-radius:999px;padding:3px 8px'), background: fx.alarm ? '#1aa46a' : 'rgba(255,255,255,.14)' }}>🔔 Alarm</span>
        {CHIPS.map(([k, l, w], i) => (
          <span key={i} style={{ ...sx('font-size:11.5px;font-weight:900;border-radius:999px;padding:3px 8px;white-space:nowrap'), background: fx.chips[k] ? '#1aa46a' : 'rgba(255,255,255,.14)' }}><b>{l}</b> {w}</span>
        ))}
      </div>
    </div>
  );
}

// hold-to-spray: pointer down squeezes, letting go (or sliding off) stops
function HoldButton({ onHold, children, style }) {
  const held = useRef(false);
  const set = (on) => { if (held.current !== on) { held.current = on; onHold(on); } };
  useEffect(() => () => { if (held.current) onHold(false); }, []);
  return (
    <button aria-label="Squeeze to spray (hold)" onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(true); }} onPointerUp={() => set(false)} onPointerCancel={() => set(false)} onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()} style={{ ...style, touchAction: 'none' }}>{children}</button>
  );
}

export function PassControls({ fx, onPull, onSqueeze, onStep, onStop }) {
  const bottom = 'calc(env(safe-area-inset-bottom, 0px) + ';
  return (
    <>
      <div style={{ ...sx('position:absolute;left:22px;z-index:6;width:124px;text-align:center;pointer-events:none;font-weight:900;font-size:12px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6)'), bottom: bottom + '156px)' }}>Aim: ↕ low · ↔ sweep</div>
      <div style={{ ...sx('position:absolute;right:16px;z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:10px'), bottom: bottom + '22px)' }}>
        <button onClick={onStop} style={sx('background:rgba(14,34,51,.86);border:1px solid rgba(255,255,255,.25);border-radius:14px;padding:8px 12px;font-weight:900;font-size:12.5px;color:#fff')}>✕ Stop and walk</button>
        <div style={sx('display:flex;gap:8px')}>
          <button onClick={() => onStep(1)} style={sx('background:rgba(255,255,255,.94);border-radius:14px;padding:8px 10px;font-weight:900;font-size:12.5px;color:#16303f;box-shadow:0 3px 0 rgba(0,0,0,.3)')}>⬆ Step closer</button>
          <button onClick={() => onStep(-1)} style={sx('background:rgba(255,255,255,.94);border-radius:14px;padding:8px 10px;font-weight:900;font-size:12.5px;color:#16303f;box-shadow:0 3px 0 rgba(0,0,0,.3)')}>⬇ Step back</button>
        </div>
        {!fx.pinPulled
          ? <button onClick={onPull} aria-label="Pull the pin" {...pr("width:132px;height:132px;border-radius:50%;background:#ffc53d;color:#4a2a00;font:800 20px/1.05 'Baloo 2',sans-serif;box-shadow:0 6px 0 #c98f00,0 0 0 8px rgba(255,197,61,.35);animation:bh-pulse 1.6s infinite", 'transform:translateY(4px);box-shadow:0 2px 0 #c98f00')}><b style={sx('display:block;font-size:34px')}>P</b>Pull the pin</button>
          : <HoldButton onHold={onSqueeze} style={{ ...sx("width:132px;height:132px;border-radius:50%;color:#fff;font:800 20px/1.05 'Baloo 2',sans-serif;user-select:none;-webkit-user-select:none"), background: fx.spraying ? '#0c7a4a' : '#1aa46a', boxShadow: fx.spraying ? '0 2px 0 #075233,0 0 0 10px rgba(95,211,155,.45)' : '0 6px 0 #0c7a4a,0 0 0 8px rgba(95,211,155,.3)', transform: fx.spraying ? 'translateY(4px)' : 'none' }}>
            <b style={sx('display:block;font-size:34px')}>S</b>{fx.spraying ? 'Spraying…' : 'Hold to squeeze'}
          </HoldButton>}
      </div>
    </>
  );
}

// ---------- choosing a level, and the results ----------
export function ChooseSheet({ game, Sheet, onPick, onClose }) {
  const g = GAMES[game];
  return (
    <Sheet onClose={onClose} title={g.icon + ' ' + g.name} sub="Choose your challenge">
      <div style={sx('display:flex;align-items:flex-end;gap:10px')}>
        <span style={sx('flex:none')}><Mascot size={56} wave /></span>
        <div style={sx('flex:1;background:#fff5df;border:2px solid #ffe2a8;border-radius:20px 20px 20px 6px;padding:12px 14px;font-weight:800;font-size:14.5px;line-height:1.45;color:#25404e')}><b style={sx('color:#7a5400')}>Bayani's tip:</b> {g.tip}</div>
      </div>
      {g.modes.map(([icon, level, title, text], i) => (
        <button key={level} onClick={() => onPick(i === 0 ? 'easy' : 'hard')} {...pr('display:flex;gap:14px;align-items:center;text-align:left;background:#fff;border-radius:22px;padding:16px;box-shadow:0 5px 0 rgba(0,0,0,.25)', 'transform:translateY(3px);box-shadow:0 2px 0 rgba(0,0,0,.25)')}>
          <span style={{ ...sx('width:58px;height:58px;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:30px;flex:none'), background: i ? '#fff1e3' : '#e5f6ee' }}>{icon}</span>
          <span style={sx('flex:1')}>
            <span style={{ ...sx('display:inline-block;font-size:11px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;border-radius:999px;padding:3px 9px;margin-bottom:4px'), background: i ? '#fff1e3' : '#e5f6ee', color: i ? '#a84d04' : '#0c7a4a' }}>{level}</span>
            <b style={sx("display:block;font:800 20px/1.1 'Baloo 2',sans-serif;padding-top:2px")}>{title}</b>
            <span style={sx('display:block;font-weight:700;font-size:14px;line-height:1.4;color:#4f6572')}>{text}</span>
          </span>
        </button>
      ))}
    </Sheet>
  );
}

const Review = ({ title, kind, rows }) => (
  <div style={{ ...sx(CARD + ';gap:8px'), border: '2px solid ' + (kind === 'warn' ? '#ffd9ad' : '#bfe9d4') }}>
    <b style={{ ...sx('font-weight:900;font-size:15px'), color: kind === 'warn' ? '#a84d04' : '#0c7a4a' }}>{title}</b>
    {rows.map((r, i) => (
      <div key={i} style={sx('display:flex;gap:10px;align-items:flex-start')}>
        <span style={sx('font-size:24px;width:34px;text-align:center;flex:none')}>{r.icon}</span>
        <span style={sx('font-weight:700;font-size:13.5px;line-height:1.4;color:#3d5563')}><b style={sx('color:#16303f;font-weight:900')}>{r.name}</b><br />{r.info}</span>
      </div>
    ))}
  </div>
);

export function GoBagResult({ r, newBadge, Sheet, onAgain, onClose }) {
  return (
    <Sheet onClose={onClose} title="🎒 Go Bag Challenge" sub={(r.level === 'hard' ? 'Difficult' : 'Easy') + ' · ' + r.packed.length + ' packed'}>
      {r.stars >= 3 && <Confetti />}
      <div style={sx(CARD + ';align-items:center;text-align:center')}>
        <Stars n={r.stars} />
        <div style={sx(H2)}>{r.stars >= 3 ? 'Great packing!' : r.stars === 2 ? 'Good packing!' : 'Nice try!'}</div>
        <p style={sx('margin:0;font-weight:800;font-size:15.5px;line-height:1.45;color:#25404e')}>{r.line}</p>
        {newBadge && <span style={sx('font-weight:900;font-size:14px;color:#0c7a4a;background:#e5f6ee;border-radius:999px;padding:6px 12px;animation:bh-pop .5s .6s both')}>🏅 New badge: Go Bag</span>}
      </div>
      {r.missed.length > 0 && <Review title="Handy things you missed" kind="miss" rows={r.missed} />}
      {r.wrong.length > 0 && <Review title="Better left at home" kind="warn" rows={r.wrong} />}
      {!r.missed.length && !r.wrong.length && <div style={sx(CARD)}><b style={sx('color:#0c7a4a;font-size:15px')}>Perfect pack. You brought the essentials and left the extras behind.</b></div>}
      <div style={sx('display:flex;gap:8px;align-items:flex-start;background:#eef6fa;border-radius:16px;padding:12px 14px;font-weight:800;font-size:14px;line-height:1.45;color:#25404e')}>🏠 {GAMES.gobag.remind}</div>
      <div style={sx('display:flex;gap:10px')}>
        <button onClick={onClose} style={sx(SOFT + ';flex:1')}>Keep exploring</button>
        <button onClick={onAgain} {...BIG('#d9650a', '#a34a05')} style={{ ...BIG('#d9650a', '#a34a05').style, flex: 1 }}>🎒 Pack again</button>
      </div>
    </Sheet>
  );
}

export function FireResult({ r, newBadge, Sheet, onAgain, onClose }) {
  const won = r.kind === 'won';
  return (
    <Sheet onClose={onClose} title="🧯 Fire Practice" sub={(r.level === 'hard' ? 'Difficult' : 'Easy') + (won ? ' · ' + r.time + ' seconds' : '')}>
      {won && r.stars >= 3 && <Confetti />}
      <div style={sx(CARD + ';align-items:center;text-align:center')}>
        {won ? <Stars n={r.stars} /> : <span style={sx('font-size:54px')}>🏃</span>}
        <div style={sx(H2)}>{won ? 'You put out the fire!' : 'Get out!'}</div>
        <p style={sx('margin:0;font-weight:800;font-size:15.5px;line-height:1.45;color:#25404e')}>
          {won ? 'Time: ' + r.time + ' s · aimed at the base ' + r.accuracy + '% of the time.' : 'The extinguisher ran out and the fire is still burning. When that happens, get out fast, close the door, and call for help.'}
        </p>
        {newBadge && <span style={sx('font-weight:900;font-size:14px;color:#0c7a4a;background:#e5f6ee;border-radius:999px;padding:6px 12px;animation:bh-pop .5s .6s both')}>🏅 New badge: Fire Out</span>}
      </div>
      <div style={sx(CARD + ';gap:8px')}>
        <b style={sx('font-weight:900;font-size:15px')}>Safety check</b>
        {r.checks.map(([icon, text, ok], i) => (
          <div key={i} style={sx('display:flex;align-items:center;gap:10px;font-weight:800;font-size:14.5px')}>
            <span style={{ ...sx('width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff;flex:none'), background: ok ? '#1aa46a' : '#c9d6de' }}>{ok ? '✓' : '–'}</span>
            <span style={{ color: ok ? '#16303f' : '#6b7f8a' }}>{icon} {text}</span>
          </div>
        ))}
      </div>
      <div style={sx('display:flex;gap:8px;align-items:flex-start;background:#fff1e3;border-radius:16px;padding:12px 14px;font-weight:800;font-size:14px;line-height:1.45;color:#5c3500')}>⚠️ {GAMES.fire.remind}</div>
      <div style={sx('display:flex;gap:10px')}>
        <button onClick={onClose} style={sx(SOFT + ';flex:1')}>Keep exploring</button>
        <button onClick={onAgain} {...BIG('#c62f22', '#922a20')} style={{ ...BIG('#c62f22', '#922a20').style, flex: 1 }}>🔥 Practice again</button>
      </div>
    </Sheet>
  );
}
