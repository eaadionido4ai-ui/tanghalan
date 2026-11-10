import { useEffect, useRef, useState } from 'react';
import { sx, pr } from '../ui/sx.js';
import { BayaniChip, BayaniTip, HoloBayani, HoloFace, HOLO_CARD } from '../ui/bayani.jsx';
import { P } from '../data.js';
import { ROOMS, DOORS, WORKS, KINDS, SAMPLE_NOTE, NAME_PARTS, GAMES, room, picOf } from '../museum/content.js';
import { createMuseum } from '../museum/runtime.js';
import { loadProgress, saveProgress } from '../museum/store.js';
import { readLines, stopReading } from '../museum/speech.js';
import { goBagRoom } from '../rooms/gobag.js';
import { fireRoom } from '../rooms/fire.js';
import { sfx } from '../rooms/sfx.js';
import { GoBagBar, Tray, LookCard, BagSheet, FireBar, PassControls, ChooseSheet, GoBagResult, FireResult } from './GameHud.jsx';

// TANGHALAN, the walk-in 3D museum: the controls, the sheets for a work, the map and the welcome. The two game
// rooms are played in the museum itself (src/rooms), with their controls and results on this screen. Bayani, the
// hologram guide, is called with the round button at the top, and what he says shows under it.

const TOTAL = WORKS.length;
const BTN = 'width:48px;height:48px;border-radius:15px;background:rgba(255,255,255,.94);color:#16303f;font-size:20px;font-weight:900;box-shadow:0 4px 0 rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;flex:none';
const CHIP = 'font-size:11.5px;font-weight:900;border-radius:999px;padding:4px 10px;white-space:nowrap';
const CARD = 'background:#fff;border-radius:22px;padding:15px 16px;display:flex;flex-direction:column;gap:10px';
const SHORT = { bulwagan: 'Bulwagan', kuwentuhan: 'Kuwentuhan', mit: 'Stop Hazards', fireroom: 'Fire Room', gobagroom: 'Go Bag Room' };
const BAYANI_LINES = [
  'Hi! I am a hologram, so I only pop up when you need me: when you stop at a work, or when you tap my button.',
  'Each room has a color: blue, green, orange and purple, like the four pillars.',
  'The floating 👀 and 📖 bubbles mark the works you have not seen yet.',
  'In the Go Bag Room you can pack a real go bag. In the Fire Safety Room you can put out a practice fire!',
  'Lost? Tap the map at the top to see where you are.',
  'Many works have a tip from me. Read it, then try it!',
];

export function FullName({ accent }) {
  return <>{NAME_PARTS.map(([a, b], i) => <span key={i}><span style={{ whiteSpace: 'nowrap' }}>{a && <b style={{ color: accent, fontWeight: 900 }}>{a}</b>}{b.trimEnd()}</span>{b.endsWith(' ') ? ' ' : ''}</span>)}</>;
}

const seenIn = (prog, id) => WORKS.filter((w) => w.room === id && prog.seen[w.id]).length;

// ---------- the museum map: the same rooms and doors as the 3D world ----------
function MapSVG({ roomId, pos, visited, me, mini }) {
  const X = (x) => (x + 13) * 10, Z = (z) => (z + 20) * 10;
  const at = pos || (() => { const r = room(roomId); return { x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }; })();
  return (
    <svg viewBox="0 0 260 290" style={{ display: 'block', width: '100%', height: 'auto', fontFamily: 'Nunito,sans-serif' }} aria-hidden="true">
      <rect width="260" height="290" rx="16" fill={mini ? 'rgba(14,34,51,.6)' : '#f6f1e7'} />
      {ROOMS.map((r) => (
        <rect key={r.id} x={X(r.x0) + 3} y={Z(r.z0) + 3} width={(r.x1 - r.x0) * 10 - 6} height={(r.z1 - r.z0) * 10 - 6} rx="9"
          fill={r.id === 'bulwagan' ? '#16303f' : '#' + r.wall.toString(16).padStart(6, '0')} stroke={r.accent} strokeWidth={r.id === roomId ? (mini ? 7 : 5) : (mini ? 4 : 2.5)} />
      ))}
      {DOORS.map((d, i) => (d.axis === 'x'
        ? <rect key={i} x={X(d.from)} y={Z(d.at) - 6} width={(d.to - d.from) * 10} height="12" fill="#e9dcc4" />
        : <rect key={i} x={X(d.at) - 6} y={Z(d.from)} width="12" height={(d.to - d.from) * 10} fill="#e9dcc4" />))}
      {!mini && ROOMS.map((r) => {
        const cx = X((r.x0 + r.x1) / 2), cz = Z((r.z0 + r.z1) / 2);
        return (
          <g key={'t' + r.id}>
            <text x={cx} y={cz - 4} fontSize="17" textAnchor="middle">{r.icon}</text>
            <text x={cx} y={cz + 14} fontSize="10.5" fontWeight="900" textAnchor="middle" fill={r.id === 'bulwagan' ? '#ffc53d' : '#16303f'}>{SHORT[r.id] || r.name}</text>
            {visited && visited[r.id] && <g><circle cx={X(r.x1) - 14} cy={Z(r.z0) + 14} r="7.5" fill="#1aa46a" /><text x={X(r.x1) - 14} y={Z(r.z0) + 18} fontSize="10" fontWeight="900" fill="#fff" textAnchor="middle">✓</text></g>}
          </g>
        );
      })}
      {mini
        ? <circle cx={X(at.x)} cy={Z(at.z)} r="13" fill="#ffc53d" stroke="#fff" strokeWidth="5" />
        : <g><circle cx={X(at.x)} cy={Z(at.z)} r="13" fill="#fff" stroke="#f2760c" strokeWidth="3" /><text x={X(at.x)} y={Z(at.z) + 5} fontSize="14" textAnchor="middle">{me}</text></g>}
    </svg>
  );
}

// ---------- on-screen controls ----------
// a phone held sideways: little height, so the tray of things moves down beside the joystick
function useShort() {
  const q = () => typeof window !== 'undefined' && window.innerHeight < 520 && window.innerWidth > window.innerHeight;
  const [s, set] = useState(q);
  useEffect(() => { const f = () => set(q()); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);
  return s;
}

function Joystick({ onMove, aim }) {
  const base = useRef(null), id = useRef(null);
  const [k, setK] = useState([0, 0]);
  const R = 44;
  const upd = (e) => {
    const b = base.current.getBoundingClientRect();
    let dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
    const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    setK([dx, dy]); onMove(dx / R, dy / R);
  };
  const end = () => { id.current = null; setK([0, 0]); onMove(0, 0); };
  return (
    <div ref={base} aria-hidden="true" data-joystick=""
      onPointerDown={(e) => { id.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); upd(e); }}
      onPointerMove={(e) => { if (e.pointerId === id.current) upd(e); }}
      onPointerUp={end} onPointerCancel={end}
      style={{ ...sx('position:absolute;left:22px;bottom:calc(env(safe-area-inset-bottom, 0px) + 26px);width:124px;height:124px;border-radius:50%;touch-action:none;z-index:5'), background: aim ? 'rgba(198,47,34,.5)' : 'rgba(14,34,51,.45)', border: '2px solid ' + (aim ? 'rgba(255,214,200,.7)' : 'rgba(255,255,255,.35)') }}>
      <span style={{ ...sx('position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,255,255,.92);box-shadow:0 2px 6px rgba(0,0,0,.3);pointer-events:none;display:flex;align-items:center;justify-content:center;font-size:22px'), transform: 'translate(' + k[0] + 'px,' + k[1] + 'px)' }}>{aim ? '🎯' : ''}</span>
    </div>
  );
}

function Loading({ f }) {
  return (
    <div style={sx('position:absolute;inset:0;z-index:20;background:radial-gradient(120% 80% at 50% 0%,#24465c,#0e2233);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;color:#fff;padding:24px;text-align:center')}>
      <HoloBayani size={84} appear />
      <div style={sx("font:800 26px/1.1 'Baloo 2',sans-serif;padding-top:4px")}>Opening TANGHALAN…</div>
      <div style={sx('max-width:340px;font-weight:800;font-size:13px;line-height:1.45;color:#bcd4e0')}><FullName accent="#ffc53d" /></div>
      <div style={sx('width:min(260px,70vw);height:10px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden')}><div style={{ ...sx('height:100%;background:#ffc53d;border-radius:999px;transition:width .2s'), width: Math.round(f * 100) + '%' }} /></div>
    </div>
  );
}

// ---------- the sheets ----------
export function Sheet({ children, onClose, title, sub, extra }) {
  return (
    <div style={sx('position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;background:#0b1a26;animation:bh-up .22s ease-out both')}>
      <div style={sx('flex:none;display:flex;align-items:center;gap:10px;padding:calc(env(safe-area-inset-top, 0px) + 12px) 14px 10px')}>
        <button onClick={onClose} aria-label="Close" style={sx(BTN)}>✕</button>
        <div style={sx('flex:1;min-width:0;text-align:center;color:#fff')}>
          <div style={sx("font:800 17px/1.15 'Baloo 2',sans-serif;padding-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{title}</div>
          {sub && <div style={sx('font-size:12px;font-weight:800;color:#bcd4e0')}>{sub}</div>}
        </div>
        {extra || <span style={sx('width:48px;flex:none')} />}
      </div>
      <div className="scroll" style={sx('flex:1;min-height:0;padding:4px 16px calc(env(safe-area-inset-bottom, 0px) + 26px)')}>
        <div style={sx('max-width:620px;margin:0 auto;display:flex;flex-direction:column;gap:14px;position:relative')}>{children}</div>
      </div>
    </div>
  );
}

function Toggle({ lang, setLang }) {
  return (
    <div role="group" aria-label="Language" style={sx('display:flex;background:#eef3f6;border-radius:999px;padding:3px;width:max-content;gap:2px')}>
      {[['fil', 'Filipino'], ['en', 'English']].map(([k, t]) => (
        <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} style={{ ...sx('padding:6px 13px;border-radius:999px;font-weight:800;font-size:12.5px'), background: lang === k ? '#16303f' : 'transparent', color: lang === k ? '#fff' : '#3d5563' }}>{t}</button>
      ))}
    </div>
  );
}

function WorkSheet({ prefs, id, lang, setLang, prog, save, onClose, onPick, onGoPlay }) {
  const w = WORKS.find((x) => x.id === id);
  const r = room(w.room), list = WORKS.filter((x) => x.room === w.room), idx = list.indexOf(w);
  const pages = w.pages ? w.pages[lang] : [[w.about[lang]]];
  const [page, setPage] = useState(0);
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false); // tapped Listen while Sound is off
  useEffect(() => { stopReading(); setPage(0); setLine(-1); setPlaying(false); }, [id, lang]);
  useEffect(() => () => stopReading(), []);
  const stop = () => { stopReading(); setPlaying(false); setLine(-1); };
  const play = () => {
    if (!prefs.sound) { setMuted(true); return; }
    let p = page;
    setPlaying(true);
    const run = () => readLines(pages[p], lang, (i) => { setPage(p); setLine(i); }, () => {
      if (p + 1 < pages.length) { p += 1; run(); } else { setPlaying(false); setLine(-1); }
    });
    run();
  };
  const turn = (d) => { stop(); setPage(page + d); };
  const kind = KINDS[w.kind], pil = P[w.pillar];
  const here = GAMES[w.game];
  const frame = w.kind === 'art' ? pil.ring : '#eaa100';
  const sticker = prog.stickers[w.id];
  const give = (e) => { const st = { ...prog.stickers }; if (sticker === e) delete st[w.id]; else st[w.id] = e; save({ ...prog, stickers: st }); };
  const nav = (d) => <button onClick={() => onPick(list[idx + d].id)} disabled={!list[idx + d]} aria-label={d < 0 ? 'Previous work' : 'Next work'} style={{ ...sx(BTN), opacity: list[idx + d] ? 1 : 0.35 }}>{d < 0 ? '‹' : '›'}</button>;
  return (
    <Sheet onClose={onClose} title={r.icon + ' ' + r.name} sub={(idx + 1) + ' of ' + list.length + ' in this room'} extra={<span style={sx('display:flex;gap:8px')}>{nav(-1)}{nav(1)}</span>}>
      <div style={sx('align-self:center;width:100%;max-width:' + (w.kind === 'art' || w.stand || w.kind === 'comic' ? '560px' : '400px'))}>
        <div style={{ ...sx('background:#fdfbf5;padding:7px;border-radius:4px;box-shadow:0 10px 26px rgba(0,0,0,.4)'), border: '9px solid ' + frame }}>
          <img src={picOf(w)} alt={w.title} style={{ display: 'block', width: '100%' }} />
        </div>
      </div>
      <div style={sx('display:flex;gap:10px;align-items:flex-start;background:#fff1e3;border:2px solid #f6c48f;border-radius:16px;padding:10px 12px;font-weight:800;font-size:13px;line-height:1.45;color:#5c3500')}>
        <span style={sx('flex:none;font-size:10.5px;font-weight:900;letter-spacing:.6px;background:#d9650a;color:#fff;border-radius:999px;padding:3px 8px;margin-top:1px')}>SAMPLE</span>
        <span>This entry is a sample of how the virtual museum is envisioned. The name, age and place are made up.</span>
      </div>
      <div style={sx(CARD)}>
        <div style={sx('display:flex;gap:6px;flex-wrap:wrap')}>
          <span style={sx(CHIP + ';background:#eef3f6;color:#3d5563')}>{kind.icon} {w.medium || kind.label}{w.stand ? ' · story stand' : ''}</span>
          <span style={{ ...sx(CHIP), background: pil.tint, color: pil.text }}>{pil.icon} {pil.name}</span>
        </div>
        <div>
          <div style={sx("font:800 25px/1.05 'Baloo 2',sans-serif;padding-top:3px")}>{w.title}</div>
          <div style={sx('font-weight:800;font-size:13.5px;color:#4f6572;margin-top:3px')}>by <b style={sx('color:#16303f')}>{w.by}</b>, {w.age} · {w.grade} · {w.place}</div>
        </div>
        <Toggle lang={lang} setLang={setLang} />
        <div style={sx('display:flex;flex-direction:column;gap:3px;margin:0 -6px')} aria-live="polite">
          {pages[page].map((l, i) => (
            <p key={i} style={{ ...sx('margin:0;padding:4px 6px;border-radius:10px;font-weight:800;font-size:16px;line-height:1.45;color:#25404e'), ...(w.kind === 'art' ? sx('font-style:italic;font-weight:700') : {}), ...(i === line ? sx('background:#ffe58a;color:#16303f') : {}) }}>
              {w.kind === 'art' ? '“' + l + '”' : l}
            </p>
          ))}
        </div>
        {pages.length > 1 && (
          <div style={sx('display:flex;align-items:center;justify-content:center;gap:12px;font-weight:900;font-size:13px;color:#4f6572')}>
            <button onClick={() => turn(-1)} disabled={page === 0} aria-label="Previous page" style={{ ...sx('width:38px;height:38px;border-radius:12px;background:#eef3f6;font-size:18px;font-weight:900'), opacity: page === 0 ? 0.4 : 1 }}>‹</button>
            Page {page + 1} of {pages.length}
            <button onClick={() => turn(1)} disabled={page === pages.length - 1} aria-label="Next page" style={{ ...sx('width:38px;height:38px;border-radius:12px;background:#eef3f6;font-size:18px;font-weight:900'), opacity: page === pages.length - 1 ? 0.4 : 1 }}>›</button>
          </div>
        )}
        <button onClick={playing ? stop : play} {...pr("display:flex;align-items:center;justify-content:center;gap:8px;background:" + (playing ? '#16303f' : '#d9650a') + ";color:#fff;font:800 18px 'Baloo 2',sans-serif;padding:11px 18px 8px;border-radius:999px;box-shadow:0 5px 0 " + (playing ? '#0b1c27' : '#a34a05'), 'transform:translateY(3px);box-shadow:0 2px 0 ' + (playing ? '#0b1c27' : '#a34a05'))}>
          {playing ? '⏹ Stop' : w.kind === 'art' ? '🔊 Listen to ' + w.by : '🔊 Read it to me'}
        </button>
        {muted && !prefs.sound && <div role="status" style={sx('text-align:center;font-weight:800;font-size:13.5px;line-height:1.4;color:#a8261a')}>🔇 Sound is off. Close this and turn on Sound in Settings (the ⚙ button) to listen.</div>}
        <div style={sx('display:flex;align-items:center;gap:8px;flex-wrap:wrap')}>
          <span style={sx('font-weight:900;font-size:13px;color:#4f6572;margin-right:2px')}>Give a sticker</span>
          {['❤️', '👏', '🌟'].map((e) => (
            <button key={e} onClick={() => give(e)} aria-pressed={sticker === e} aria-label={'Sticker ' + e}
              style={{ ...sx('width:44px;height:44px;border-radius:14px;font-size:21px;display:flex;align-items:center;justify-content:center'), background: sticker === e ? '#fff1c7' : '#eef3f6', boxShadow: sticker === e ? 'inset 0 0 0 3px #eaa100' : 'none' }}>{e}</button>
          ))}
        </div>
      </div>
      <BayaniTip extra={here && (
        <button onClick={() => { stopReading(); onGoPlay(here); }} {...pr('align-self:flex-start;display:flex;align-items:center;gap:8px;background:#128253;color:#fff;font-weight:900;font-size:14.5px;padding:9px 15px;border-radius:999px;box-shadow:0 4px 0 #0b5e3b', 'transform:translateY(3px);box-shadow:0 1px 0 #0b5e3b')}>{here.icon} Try it in the {room(here.room).name}</button>
      )}>{w.note}</BayaniTip>
    </Sheet>
  );
}

function MapSheet({ me, prog, roomId, pos, onGo, onClose }) {
  return (
    <Sheet onClose={onClose} title="🗺️ Museum map" sub={'You are in ' + room(roomId).name}>
      <div style={sx('background:#fff;border-radius:22px;padding:10px;align-self:center;width:100%;max-width:440px')}>
        <MapSVG roomId={roomId} pos={pos} visited={prog.rooms} me={me} />
        <div style={sx('display:flex;gap:14px;justify-content:center;flex-wrap:wrap;font-weight:800;font-size:12px;color:#4f6572;margin-top:8px')}>
          <span style={sx('display:flex;align-items:center;gap:6px')}><i style={sx('font-style:normal;width:20px;height:20px;border-radius:50%;background:#1aa46a;color:#fff;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center')}>✓</i>Rooms you visited</span>
          <span style={sx('display:flex;align-items:center;gap:6px')}><i style={sx('font-style:normal;width:22px;height:22px;border-radius:50%;background:#fff;border:2px solid #f2760c;font-size:12px;display:flex;align-items:center;justify-content:center')}>{me}</i>You are here</span>
        </div>
      </div>
      <div style={sx('background:#fff;border-radius:22px;overflow:hidden')}>
        {ROOMS.map((r, i) => {
          const total = WORKS.filter((w) => w.room === r.id).length, n = seenIn(prog, r.id), here = r.id === roomId;
          const g = r.game && GAMES[r.game], best = g && prog.games[g.id];
          return (
            <div key={r.id} style={{ ...sx('display:flex;align-items:center;gap:12px;padding:11px 14px'), borderTop: i ? '1px solid #e3ecf1' : 'none' }}>
              <span style={{ ...sx('width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:21px;flex:none'), background: r.id === 'bulwagan' ? '#16303f' : '#' + r.wall.toString(16).padStart(6, '0'), border: '2px solid ' + r.accent }}>{r.icon}</span>
              <span style={sx('flex:1;min-width:0')}>
                <b style={sx('display:block;font-weight:900;font-size:15px')}>{r.name}</b>
                <span style={sx('display:block;font-weight:700;font-size:12.5px;color:#4f6572')}>{g ? '🎮 ' + g.name + (best ? ' · best ' + '★'.repeat(best.stars) + (best.badge ? ' · 🏅' : '') : '') : total ? n + ' of ' + total + ' works seen' : 'The way in'}{prog.rooms[r.id] ? ' · visited' : ''}</span>
              </span>
              {here
                ? <span style={sx('font-weight:900;font-size:12px;color:#a84d04;background:#fff1e3;border-radius:999px;padding:6px 10px')}>You are here</span>
                : <button onClick={() => onGo(r.id)} aria-label={'Go to ' + r.name} style={sx('font-weight:900;font-size:13.5px;color:#fff;background:#2a6b8f;border-radius:999px;padding:8px 14px;box-shadow:0 3px 0 #1f5675')}>Go ›</button>}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

function IntroSheet({ onClose }) {
  const steps = [
    ['🕹️', 'Walk', 'Use the joystick, or the arrow keys on a computer.'],
    ['👆', 'Look around', 'Drag the screen. Pinch to zoom in or out.'],
    ['👀', 'Look at art', 'Walk up to a picture and tap Look.'],
    ['📖', 'Read and listen', 'At a story stand or a reading wall, tap Read.'],
    ['🎒', 'Pack a go bag', 'In the Go Bag Room, take a bag from the packing table and pack it yourself.'],
    ['🧯', 'Put out a practice fire', 'In the Fire Safety Room, press the alarm, take the extinguisher, and use PASS.'],
    ['🗺️', 'Find your way', 'Tap the map to see where you are, or jump to a room.'],
    [null, 'Ask Bayani', 'Your hologram guide appears when you stop at a work. Tap his round button to call him.'],
  ];
  return (
    <Sheet onClose={onClose} title="Welcome to TANGHALAN">
      <div style={sx(CARD + ';align-items:center;text-align:center')}>
        <HoloBayani size={64} pad wave appear />
        <div style={sx("font:800 26px/1.1 'Baloo 2',sans-serif;padding-top:4px")}>Maligayang pagdating!</div>
        <div style={sx('font-weight:800;font-size:13.5px;line-height:1.45;color:#4f6572')}><b style={sx('color:#16303f;font-weight:900')}>TANGHALAN:</b> <FullName accent="#d9650a" /></div>
        <p style={sx('margin:0;font-weight:700;font-size:15px;line-height:1.5;color:#25404e')}>TANGHALAN is a museum of art and stories made by kids about staying safe and helping each other. Walk from room to room. Bayani, your hologram guide, appears when you need him.</p>
      </div>
      <div style={sx(CARD)}>
        {steps.map((st) => (
          <div key={st[1]} style={sx('display:flex;gap:12px;align-items:center')}>
            <span style={sx('width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:22px;flex:none;overflow:hidden;background:' + (st[0] ? '#eef6fa' : '#0b1d2b'))}>{st[0] || <HoloFace size={38} />}</span>
            <span><b style={sx('display:block;font-weight:900;font-size:15px')}>{st[1]}</b><span style={sx('display:block;font-weight:700;font-size:13.5px;color:#4f6572;line-height:1.4')}>{st[2]}</span></span>
          </div>
        ))}
      </div>
      <div style={sx('display:flex;gap:10px;align-items:flex-start;background:#fff1e3;border-radius:16px;padding:12px 14px;font-weight:800;font-size:13.5px;line-height:1.5;color:#5c3500')}>
        <span style={sx('flex:none;font-size:10.5px;font-weight:900;letter-spacing:.6px;background:#d9650a;color:#fff;border-radius:999px;padding:3px 8px;margin-top:2px')}>SAMPLE</span>
        <span>{SAMPLE_NOTE}</span>
      </div>
      <button onClick={onClose} {...pr("background:#d9650a;color:#fff;font:800 20px 'Baloo 2',sans-serif;padding:13px 24px 10px;border-radius:999px;box-shadow:0 5px 0 #a34a05", 'transform:translateY(4px);box-shadow:0 1px 0 #a34a05')}>Start exploring</button>
    </Sheet>
  );
}

// Without 3D, the works are still all here, room by room.
function Gallery({ prog, onOpen, onExit }) {
  return (
    <div className="scroll" style={sx('position:absolute;inset:0;z-index:10;background:radial-gradient(120% 70% at 50% -10%,#eef6fa,#cfe6ef);padding:calc(env(safe-area-inset-top, 0px) + 18px) 18px 30px')}>
      <div style={sx('max-width:980px;margin:0 auto;display:flex;flex-direction:column;gap:14px')}>
        <div style={sx('display:flex;align-items:center;gap:12px')}>
          <button onClick={onExit} aria-label="Back" style={sx('width:48px;height:48px;border-radius:16px;background:#fff;border:2px solid #d5e3ea;box-shadow:0 4px 0 #d5e3ea;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;flex:none')}>←</button>
          <div style={sx("flex:1;font:800 26px/1.05 'Baloo 2',sans-serif;padding-top:4px")}>TANGHALAN</div>
        </div>
        <p style={sx('margin:0;background:#fff;border-radius:18px;padding:12px 14px;font-weight:700;font-size:14px;line-height:1.45;color:#25404e')}>The 3D museum could not open on this device, so the game rooms are closed, but every work is here. {SAMPLE_NOTE}</p>
        {ROOMS.filter((r) => WORKS.some((w) => w.room === r.id)).map((r) => (
          <div key={r.id} style={sx('display:flex;flex-direction:column;gap:10px')}>
            <div style={{ ...sx('font-size:13px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;margin-top:6px'), color: r.accent }}>{r.icon} {r.name}</div>
            <div style={sx('display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr));gap:10px')}>
              {WORKS.filter((w) => w.room === r.id).map((w) => (
                <button key={w.id} onClick={() => onOpen(w)} style={sx('display:flex;gap:12px;align-items:center;text-align:left;background:#fff;border-radius:18px;padding:10px;box-shadow:0 4px 0 rgba(20,48,66,.08)')}>
                  <img src={picOf(w)} alt="" loading="lazy" style={sx('width:64px;height:64px;object-fit:cover;border-radius:12px;flex:none')} />
                  <span style={sx('min-width:0')}><b style={sx("display:block;font:800 16px/1.1 'Baloo 2',sans-serif;padding-top:2px")}>{w.title}</b><span style={sx('display:block;font-weight:700;font-size:12.5px;color:#4f6572')}>{KINDS[w.kind].icon} {w.by}, {w.age}{prog.seen[w.id] ? ' · ✓ seen' : ''}</span></span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- the museum ----------
export function Museum({ visitor, prefs, setPrefs, speak, onExit, onSettings, startRoom, sheetOpen }) {
  const pid = visitor.id;
  const canvasRef = useRef(null);
  const rt = useRef(null);
  const [prog, setProg] = useState(() => loadProgress(pid));
  const [load, setLoad] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [roomId, setRoomId] = useState(startRoom || 'lobby');
  const [near, setNear] = useState(null);
  const [hint, setHint] = useState(null); // what Bayani is saying: { text, help }
  const [open, setOpen] = useState(null);
  const [gb, setGb] = useState(null);
  const [fx, setFx] = useState(null);
  const [look, setLook] = useState(null);
  const lang = prefs.lang || 'fil';
  const setLang = (l) => setPrefs({ ...prefs, lang: l });
  const progRef = useRef(prog);
  progRef.current = prog;
  const hintT = useRef(0), greeted = useRef({}), bayaniN = useRef(0), hintRoom = useRef(null);
  const nearRef = useRef(null), roomRef = useRef(roomId);
  nearRef.current = near; roomRef.current = roomId;
  const short = useShort();

  const save = (p) => { progRef.current = p; setProg(p); saveProgress(pid, p); };
  // Bayani says something: his hologram appears in the museum for as long as his words stay on the screen
  const showHint = (text, say, roomId, help) => {
    clearTimeout(hintT.current); setHint({ text, help: !!help }); hintRoom.current = roomId || null;
    hintT.current = setTimeout(hush, 7500);
    if (rt.current) rt.current.bayaniSays(8);
    if (say) speak(text);
  };
  const hush = () => { clearTimeout(hintT.current); setHint(null); hintRoom.current = null; if (rt.current) rt.current.bayaniHush(); };
  const exit = () => { stopReading(); onExit(); };
  const close = () => {
    stopReading(); setOpen(null);
    const p = progRef.current;
    if (!p.done && Object.keys(p.seen).length >= TOTAL) { save({ ...p, done: 1 }); showHint('You saw all ' + TOTAL + ' works in TANGHALAN! Maraming salamat! 🎉', true); }
  };
  // the welcome sheet closes: the first time, remember that it was seen, and Bayani greets you in the room you are in
  const closeIntro = () => {
    const first = !progRef.current.intro;
    if (first) save({ ...progRef.current, intro: true });
    close();
    if (first) { const r = room(roomRef.current); greeted.current[r.id] = 1; showHint(r.hint, true, r.id); }
  };
  const see = (id) => { const p = progRef.current; if (!p.seen[id]) save({ ...p, seen: { ...p.seen, [id]: 1 } }); };
  const rooms = () => (rt.current ? rt.current.rooms : {});
  // a game's result: keep the best stars and the badge, and say if the badge is new
  const record = (game, stars) => {
    const p = progRef.current, was = p.games[game] || { stars: 0, badge: false, plays: 0 };
    const now = { stars: Math.max(was.stars, stars), badge: was.badge || stars >= 3, plays: was.plays + 1 };
    save({ ...p, games: { ...p.games, [game]: now } });
    if (rooms()[game]) rooms()[game].setBest(now);
    return now.badge && !was.badge;
  };

  const api = useRef({});
  api.current = {
    room(r) {
      setRoomId(r.id);
      const p = progRef.current;
      if (!p.rooms[r.id]) save({ ...p, rooms: { ...p.rooms, [r.id]: 1 } });
      if (!p.intro) return; // a first visit opens with the welcome sheet; Bayani greets you when you close it
      if (!greeted.current[r.id]) { greeted.current[r.id] = 1; showHint(r.hint, true, r.id); }
      // a welcome for the room you just left is not shown in the next one
      else if (hintRoom.current && hintRoom.current !== r.id) hush();
    },
    open(it) {
      if (it.act) { it.act(); return; }
      if (it.type === 'exit') { exit(); return; }
      if (it.type !== 'work') { setOpen({ type: it.type }); return; }
      see(it.id); setOpen({ type: 'work', id: it.id });
    },
    // Bayani was called (his button, or a tap on his hologram): a tip for the work you are at, or for the game
    // room you are in, or else the next thing worth knowing about the museum
    bayani() {
      const n = nearRef.current, g = room(roomRef.current).game;
      const text = n && n.type === 'work' ? n.work.note : g ? GAMES[g].tip : BAYANI_LINES[bayaniN.current++ % BAYANI_LINES.length];
      if (rt.current) rt.current.callBayani();
      showHint(text, true, null, true);
    },
    game(type, d) {
      if (type === 'gobag') setGb(d);
      else if (type === 'fire') setFx(d);
      else if (type === 'gobag:look') setLook(d);
      else if (type === 'gobag:choose') setOpen({ type: 'choose', game: 'gobag' });
      else if (type === 'fire:choose') setOpen({ type: 'choose', game: 'fire' });
      else if (type === 'gobag:result') { const nb = record('gobag', d.stars); setOpen({ type: 'gbresult', r: d, newBadge: nb }); }
      else if (type === 'fire:result') { const nb = d.kind === 'won' ? record('fire', d.stars) : false; setOpen({ type: 'fxresult', r: d, newBadge: nb }); }
    },
  };

  useEffect(() => {
    let m = null;
    try {
      m = createMuseum(canvasRef.current, {
        avatar: visitor.id,
        rooms: [goBagRoom, fireRoom],
        onProgress: setLoad,
        onReady: () => setReady(true),
        onRoom: (r) => api.current.room(r),
        onNear: setNear,
        onOpen: (it) => api.current.open(it),
        onFar: () => showHint('Walk a little closer, then tap again.'),
        onBayani: () => api.current.bayani(),
        onGame: (type, d) => api.current.game(type, d),
        onSay: (text) => showHint(text, true),
      });
    } catch (e) {
      console.warn('TANGHALAN 3D is not available', e);
      setFailed(true);
      return undefined;
    }
    rt.current = m;
    window.__tanghalan = m; // for the walk-through tests
    const p = progRef.current;
    if (m.rooms.gobag) m.rooms.gobag.setBest(p.games.gobag || null);
    if (m.rooms.fire) m.rooms.fire.setBest(p.games.fire || null);
    if (startRoom) m.goTo(startRoom);
    return () => { clearTimeout(hintT.current); stopReading(); sfx.hiss(false); m.dispose(); rt.current = null; window.__tanghalan = null; };
  }, []);

  const pauseIt = !ready || !!open || !!look || !!sheetOpen;
  useEffect(() => { if (rt.current) rt.current.setPaused(pauseIt); }, [pauseIt]);
  useEffect(() => { if (rt.current) rt.current.setSeen(prog.seen); }, [prog.seen, ready]);
  useEffect(() => { if (ready && !progRef.current.intro) setOpen({ type: 'intro' }); }, [ready]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape' && (open || look)) { if (look) setLook(null); else if (open.type === 'intro') closeIntro(); else close(); }
      else if (e.code === 'KeyM' && !open && !look && ready && !failed && !(fx && fx.pass)) setOpen({ type: 'map' });
      else if (e.code === 'KeyB' && !open && !look && !sheetOpen && ready && !failed) api.current.bayani();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const r = room(roomId), seen = Object.keys(prog.seen).length;
  const label = near && (near.label ? near.label() : near.type === 'work' ? (near.work.kind === 'art' ? '👀 Look' : '📖 Read')
    : near.type === 'map' ? '🗺️ Map' : near.type === 'intro' ? '📋 Read' : near.type === 'exit' ? '🚪 Exit' : null);
  const top = 'calc(env(safe-area-inset-top, 0px) + 12px)';
  const packing = gb && gb.phase === 'packing' && roomId === 'gobagroom';
  const firing = fx && fx.phase === 'ready' && roomId === 'fireroom';
  const passing = fx && fx.pass;
  const hudTop = 'calc(env(safe-area-inset-top, 0px) + 70px)';
  const goPlay = (g) => { close(); if (rt.current) { rt.current.goTo(g.room); } };

  return (
    <div data-screen-label="TANGHALAN" style={sx('position:absolute;inset:0;background:#0e2233;overflow:hidden;-webkit-user-select:none;user-select:none;font-family:Nunito,system-ui,sans-serif')}>
      <canvas ref={canvasRef} style={sx('position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none')} />
      {ready && !failed && (
        <>
          <div style={{ ...sx('position:absolute;left:14px;display:flex;gap:8px;z-index:5'), top }}>
            <button onClick={exit} aria-label="Leave the museum" style={sx(BTN)}>←</button>
            <BayaniChip size={48} onClick={() => api.current.bayani()} />
          </div>
          <div style={{ ...sx('position:absolute;left:126px;right:72px;display:flex;justify-content:center;z-index:4;pointer-events:none'), top }}>
            <div style={sx('max-width:100%;min-height:48px;display:flex;flex-direction:column;justify-content:center;background:rgba(14,34,51,.8);border:1px solid rgba(255,255,255,.18);border-radius:16px;padding:5px 14px;color:#fff;text-align:center')}>
              <div style={sx("font:800 15px/1.15 'Baloo 2',sans-serif;padding-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{r.icon} {r.name}</div>
              <div style={sx('font-size:11.5px;font-weight:900;color:#ffc53d;white-space:nowrap')}>{seen} of {TOTAL} works seen</div>
            </div>
          </div>
          <div style={{ ...sx('position:absolute;right:14px;display:flex;flex-direction:column;align-items:flex-end;gap:8px;z-index:5'), top }}>
            <button onClick={onSettings} aria-label="Settings" style={sx(BTN)}>⚙</button>
            <button onClick={() => setOpen({ type: 'map' })} aria-label="Museum map" style={sx('width:84px;border-radius:14px;overflow:hidden;box-shadow:0 4px 0 rgba(0,0,0,.3);padding:0;background:transparent')}>
              <MapSVG roomId={roomId} mini />
            </button>
          </div>
          {/* the game bars, the PASS hint and Bayani's hint stack down the left, under the top buttons */}
          <div style={{ ...sx('position:absolute;left:14px;right:110px;z-index:5;display:flex;flex-direction:column;gap:8px;align-items:flex-start;pointer-events:none'), top: hudTop }}>
            {packing && <GoBagBar gb={gb} onBag={() => setOpen({ type: 'bag' })} onZip={() => rooms().gobag && rooms().gobag.finish()} />}
            {firing && <FireBar fx={fx} />}
            {passing && fx.hint && <span data-pass-hint="" style={sx('background:rgba(255,255,255,.96);color:#16303f;border-radius:999px;padding:7px 14px;font-weight:900;font-size:14.5px;box-shadow:0 6px 16px rgba(0,0,0,.25)')}>👉 {fx.hint}</span>}
            {hint && !(passing && short) && (
              <div data-hint="" style={sx(HOLO_CARD + ';display:flex;align-items:center;gap:8px;max-width:min(440px,100%);padding:5px 12px 5px 5px;pointer-events:auto;animation:bh-up .25s ease-out both')}>
                <span style={sx('flex:none;width:42px;height:42px;border-radius:50%;background:#10283a;border:1.5px solid rgba(92,225,255,.5);display:flex;align-items:center;justify-content:center;overflow:hidden')}><HoloFace size={36} /></span>
                <span style={sx('flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start')}>
                  <button onClick={hush} aria-label={hint.text + ' Tap to close.'} style={sx('text-align:left;font-weight:800;font-size:14px;line-height:1.3;padding:3px 0')}>{hint.text}</button>
                  {hint.help && <button onClick={() => { hush(); setOpen({ type: 'intro' }); }} style={sx('font-weight:900;font-size:12.5px;color:#5ce1ff;text-decoration:underline;text-underline-offset:3px;padding:3px 0 4px')}>How to explore</button>}
                </span>
              </div>
            )}
          </div>
          <Joystick aim={passing} onMove={(x, y) => { if (rt.current) rt.current.setMove(x, y); }} />
          {packing && gb.tray && gb.tray.length > 0 && (
            <div style={{ ...sx('position:absolute;right:12px;z-index:6'), left: short ? 158 : 12, bottom: 'calc(env(safe-area-inset-bottom, 0px) + ' + (short ? 14 : 166) + 'px)' }}>
              <Tray gb={gb} onLook={(id) => rooms().gobag && rooms().gobag.look(id)} />
            </div>
          )}
          {passing && (
            <PassControls fx={fx}
              onPull={() => rooms().fire && rooms().fire.pull()}
              onSqueeze={(on) => rooms().fire && rooms().fire.squeeze(on)}
              onStep={(d) => rooms().fire && rooms().fire.step(d)}
              onStop={() => rooms().fire && rooms().fire.exitPass()} />
          )}
          {label && !passing && (
            <button data-action="" onClick={() => api.current.open(near)} {...pr("position:absolute;right:20px;bottom:calc(env(safe-area-inset-bottom, 0px) + 46px);z-index:5;background:#d9650a;color:#fff;font:800 20px 'Baloo 2',sans-serif;padding:13px 22px 10px;border-radius:999px;box-shadow:0 5px 0 #a34a05,0 0 0 6px rgba(255,197,61,.55);animation:bh-up .2s ease-out both;max-width:calc(100vw - 190px)", 'transform:translateY(3px);box-shadow:0 2px 0 #a34a05,0 0 0 6px rgba(255,197,61,.55)')}>{label}</button>
          )}
        </>
      )}
      {!ready && !failed && <Loading f={load} />}
      {failed && <Gallery prog={prog} onExit={exit} onOpen={(w) => { see(w.id); setOpen({ type: 'work', id: w.id }); }} />}
      {look && (
        <LookCard it={look} onLeave={() => setLook(null)}
          onPack={() => { const g = rooms().gobag; if (g) { if (look.packed) g.unpack(look.id); else g.pack(look.id); } setLook(null); }} />
      )}
      {open && open.type === 'work' && (
        <WorkSheet prefs={prefs} id={open.id} lang={lang} setLang={setLang} prog={prog} save={save} onClose={close}
          onPick={(id) => { see(id); setOpen({ type: 'work', id }); }} onGoPlay={goPlay} />
      )}
      {open && open.type === 'map' && (
        <MapSheet me={visitor.e} prog={prog} roomId={roomId} pos={rt.current ? rt.current.position() : null} onClose={close}
          onGo={(id) => { if (rooms().fire && fx && fx.pass) rooms().fire.exitPass(); if (rt.current) rt.current.goTo(id); close(); }} />
      )}
      {open && open.type === 'intro' && <IntroSheet onClose={closeIntro} />}
      {open && open.type === 'choose' && (
        <ChooseSheet game={open.game} Sheet={Sheet} onClose={close} onPick={(level) => { const g = rooms()[open.game]; close(); if (g) g.start(level); }} />
      )}
      {open && open.type === 'bag' && gb && (
        <BagSheet gb={gb} Sheet={Sheet} onClose={close} onUnpack={(id) => rooms().gobag && rooms().gobag.unpack(id)}
          onZip={() => { close(); if (rooms().gobag) rooms().gobag.finish(); }} onQuit={() => { close(); if (rooms().gobag) rooms().gobag.quit(); }} />
      )}
      {open && open.type === 'gbresult' && (
        <GoBagResult r={open.r} newBadge={open.newBadge} Sheet={Sheet} onClose={close}
          onAgain={() => { const level = open.r.level; close(); if (rooms().gobag) rooms().gobag.start(level); }} />
      )}
      {open && open.type === 'fxresult' && (
        <FireResult r={open.r} newBadge={open.newBadge} Sheet={Sheet}
          onClose={() => { close(); if (rooms().fire) rooms().fire.reset(); }}
          onAgain={() => { const level = open.r.level; close(); const f = rooms().fire; if (f) { f.reset(); f.start(level); } }} />
      )}
    </div>
  );
}
