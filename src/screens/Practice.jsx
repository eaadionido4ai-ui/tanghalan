import { useEffect, useRef, useState } from 'react';
import { sx, pr } from '../ui/sx.js';
import { BayaniChip, HoloFace, HOLO_CARD } from '../ui/bayani.jsx';
import { createMuseum } from '../museum/runtime.js';
import { imageOf } from '../museum/content.js';
import { sfx } from '../rooms/sfx.js';
import { Joystick } from './Museum.jsx';
import poster from '../assets/home.webp';

// The practice demo in How to play: a corner of the real museum in a piece of the screen, where a child can try
// the controls before going in. It has a working joystick, a view to drag, the Look button and Bayani's button,
// and a short list that ticks off as each one is tried. It starts only when asked, so opening How to play stays
// light, and nothing done here is saved.

// where the practice happens: in the main hall, a few steps from its big featured picture, facing it
export const PRACTICE = { room: 'bulwagan', x: 0.4, z: -2.35, yaw: Math.PI / 2 };
// what to try: its id, the words, and a smaller line under them
export const TASKS = [
  ['walk', 'Push the joystick to walk.', 'On a computer, use the arrow keys.'],
  ['look', 'Drag the view to look around.', 'Pinch, or roll the mouse wheel, to zoom.'],
  ['near', 'Walk up to the big picture in front of you.', 'Bayani appears beside a work when you stop at it.'],
  ['open', 'Tap Look to open the picture.', 'You can also tap the picture itself.'],
  ['bayani', "Tap Bayani's round button for a tip.", 'He is the hologram guide. Call him any time.'],
];
const WALKED = 1.2, DRAGGED = 90; // metres walked and pixels dragged that count as having tried it
const LINES = [
  'That is it! In the museum, I appear beside each work with a tip like this.',
  'Tap my button any time you are not sure what to do.',
];

const Tick = () => <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.2 6.4 4.9 9l4.9-5.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const Play = () => <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" fill="currentColor" /></svg>;
const OVER = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center';

// visitor: whose animal walks in the practice; onEnter: the way into the museum, offered when the list is done
export function Practice({ visitor, speak, onEnter }) {
  const view = useRef(null), canvasRef = useRef(null), rt = useRef(null), hintT = useRef(0), lineN = useRef(0);
  const [phase, setPhase] = useState('idle'); // idle (not started yet), loading, on, or failed (no 3D on this device)
  const [load, setLoad] = useState(0);
  const [done, setDone] = useState([]);       // the ids of what has been tried
  const [near, setNear] = useState(null);     // the work the visitor stands at
  const [card, setCard] = useState(null);     // the work opened with Look
  const [hint, setHint] = useState(null);     // what Bayani is saying
  const [shown, setShown] = useState(true);   // the view is on the screen, not scrolled away
  const nearRef = useRef(null); nearRef.current = near;
  const mark = (id) => setDone((d) => (d.includes(id) ? d : [...d, id]));
  const left = TASKS.filter(([id]) => !done.includes(id));
  const now = left[0] || null, all = !now;

  // Bayani says something: his words show in the view, and his hologram stays for as long as they do
  const hush = () => { clearTimeout(hintT.current); setHint(null); if (rt.current) rt.current.bayaniHush(); };
  const say = (text) => {
    clearTimeout(hintT.current); setHint(text); hintT.current = setTimeout(hush, 7500);
    if (rt.current) rt.current.bayaniSays(8);
    speak(text);
  };
  const api = useRef({});
  api.current = {
    open(it) { if (it && it.type === 'work') { hush(); setCard(it.work); mark('open'); } },
    bayani() {
      const n = nearRef.current;
      if (rt.current) rt.current.callBayani();
      say(n && n.type === 'work' ? n.work.note : LINES[lineN.current++ % LINES.length]);
      mark('bayani');
    },
    far() { say('Walk a little closer, then tap again.'); },
  };

  // the corner of the museum itself, made when the practice is started
  useEffect(() => {
    if (phase !== 'loading' || rt.current) return;
    try {
      const m = createMuseum(canvasRef.current, {
        avatar: visitor.id, rooms: [], practice: PRACTICE,
        onProgress: setLoad,
        onReady: () => setPhase('on'),
        onNear: (it) => { setNear(it); if (it && it.type === 'work') mark('near'); },
        onOpen: (it) => api.current.open(it),
        onFar: () => api.current.far(),
        onBayani: () => api.current.bayani(),
      });
      m.setPaused(true);
      rt.current = m; window.__tanghalan = m; // for the browser checks
    } catch (e) {
      console.warn('TANGHALAN 3D is not available', e);
      setPhase('failed');
    }
  }, [phase]);
  useEffect(() => () => { clearTimeout(hintT.current); if (rt.current) { rt.current.dispose(); rt.current = null; window.__tanghalan = null; } }, []);
  // it rests while the picture is open and while most of the view is scrolled off the screen
  useEffect(() => { if (rt.current) rt.current.setPaused(phase !== 'on' || !!card || !shown); }, [phase, card, shown]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || !view.current) return undefined;
    const io = new IntersectionObserver((es) => setShown(es[0].intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] }); // at least half in sight
    io.observe(view.current);
    return () => io.disconnect();
  }, []);
  // walking and looking around are ticked off by how much of each has been done
  useEffect(() => {
    if (phase !== 'on') return undefined;
    const id = setInterval(() => {
      if (!rt.current) return;
      const s = rt.current.stats();
      if (s.walked >= WALKED) mark('walk');
      if (s.dragged >= DRAGGED) mark('look');
    }, 250);
    return () => clearInterval(id);
  }, [phase]);
  // a small sound for each thing tried, and a cheer for the last one (when Sound is on)
  useEffect(() => { if (done.length) { if (done.length === TASKS.length) sfx.cheer(); else sfx.pop(); } }, [done.length]);
  // the next thing to try is read aloud, as Bayani's tips are (when Sound and his voice are on)
  const nowId = now ? now[0] : 'all';
  useEffect(() => { if (phase === 'on') speak(now ? now[1] : 'You are ready! That is how you play.'); }, [phase, nowId]);

  const label = near && near.type === 'work' ? (near.work.kind === 'art' ? '👀 Look' : '📖 Read') : null;
  const head = phase === 'on' ? (all ? 'You are ready! That is how you play.' : now[1])
    : phase === 'failed' ? 'The practice cannot run on this device.' : 'Try the controls here first.';
  const sub = phase === 'on' ? (all ? 'Keep practicing here for as long as you like, or walk in.' : now[2])
    : phase === 'failed' ? 'It cannot show the museum in 3D. The written steps below cover the same things.'
      : 'A corner of the museum to practice in. Nothing you do here is saved.';

  return (
    <section className="practice" data-practice={phase} data-practice-done={done.join(' ')} aria-label="Practice demo">
      <div className="practice-head">
        <div style={sx('display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;min-height:22px')}>
          <b style={sx('flex:1;font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;color:#a84d04')}>Practice demo{phase === 'on' ? ' · ' + done.length + ' of ' + TASKS.length : ''}</b>
          {phase === 'on' && (
            <span aria-hidden="true" style={sx('display:flex;gap:5px')}>
              {TASKS.map(([id]) => {
                const ok = done.includes(id), cur = now && now[0] === id;
                return <i key={id} data-tick={id} data-on={ok ? '' : undefined} style={{ ...sx('width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:background .2s'), background: ok ? '#1aa46a' : '#fff', color: '#fff', border: '2px solid ' + (ok ? '#1aa46a' : cur ? '#16303f' : '#cfd9df') }}>{ok && <Tick />}</i>;
              })}
            </span>
          )}
        </div>
        <div role="status" aria-live="polite" style={sx('display:flex;flex-direction:column;gap:2px')}>
          <b key={'h' + phase + nowId} data-practice-now="" style={sx("font:800 20px/1.2 'Baloo 2',sans-serif;color:#16303f;padding-top:2px;animation:bh-fade .25s both")}>{head}</b>
          <span key={'s' + phase + nowId} style={sx('font-weight:700;font-size:13.5px;line-height:1.4;color:#4f6572')}>{sub}</span>
        </div>
        {phase === 'on' && all && (
          <button data-practice-enter="" onClick={onEnter} {...pr("align-self:flex-start;margin-top:8px;background:#d9650a;color:#fff;font:800 18px 'Baloo 2',sans-serif;padding:11px 22px 8px;border-radius:999px;box-shadow:0 5px 0 #a34a05", 'transform:translateY(3px);box-shadow:0 2px 0 #a34a05')}>Enter the museum</button>
        )}
      </div>

      {phase !== 'failed' && (
        <div ref={view} className="practice-view">
          {phase === 'idle'
            ? (
              <>
                <img src={poster} alt="" draggable="false" style={sx('position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5')} />
                <div style={sx(OVER + ';gap:10px;padding:16px')}>
                  <button data-practice-start="" onClick={() => setPhase('loading')} {...pr("display:flex;align-items:center;gap:10px;background:#ffd873;color:#16303f;font:800 20px 'Baloo 2',sans-serif;padding:13px 24px 10px 20px;border-radius:999px;box-shadow:0 5px 0 #c99a35", 'transform:translateY(3px);box-shadow:0 2px 0 #c99a35')}><Play />Start the practice</button>
                </div>
              </>
            )
            : <canvas ref={canvasRef} aria-label="The practice corner of the museum" style={sx('position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none')} />}
          {phase === 'loading' && (
            <div style={sx(OVER + ';gap:12px;background:radial-gradient(120% 80% at 50% 0%,#24465c,#0e2233);color:#fff;padding:16px')}>
              <b style={sx("font:800 19px/1.1 'Baloo 2',sans-serif")}>Opening the practice…</b>
              <div style={sx('width:min(220px,60%);height:9px;border-radius:999px;background:rgba(255,255,255,.18);overflow:hidden')}><div style={{ ...sx('height:100%;background:#ffc53d;border-radius:999px;transition:width .2s'), width: Math.round(load * 100) + '%' }} /></div>
            </div>
          )}
          {phase === 'on' && (
            <>
              <BayaniChip size={44} onClick={() => api.current.bayani()} style={{ position: 'absolute', left: 10, top: 10, zIndex: 5 }} />
              {hint && (
                <button data-practice-hint="" onClick={hush} aria-label={hint + ' Tap to close.'} style={sx(HOLO_CARD + ';position:absolute;left:62px;right:10px;top:10px;z-index:5;display:flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;text-align:left;border-radius:16px;animation:bh-up .25s ease-out both')}>
                  <span style={sx('flex:none;width:34px;height:34px;border-radius:50%;background:#10283a;border:1.5px solid rgba(92,225,255,.5);display:flex;align-items:center;justify-content:center;overflow:hidden')}><HoloFace size={29} /></span>
                  <span style={sx('flex:1;min-width:0;font-weight:800;font-size:13px;line-height:1.3')}>{hint}</span>
                </button>
              )}
              <Joystick size={96} style={{ left: 10, bottom: 10 }} onMove={(x, y) => { if (rt.current) rt.current.setMove(x, y); }} />
              {label && !card && (
                <button data-action="" onClick={() => api.current.open(near)} {...pr("position:absolute;right:12px;bottom:18px;z-index:5;background:#d9650a;color:#fff;font:800 18px 'Baloo 2',sans-serif;padding:11px 18px 8px;border-radius:999px;box-shadow:0 5px 0 #a34a05,0 0 0 5px rgba(255,197,61,.55);animation:bh-up .2s ease-out both", 'transform:translateY(3px);box-shadow:0 2px 0 #a34a05,0 0 0 5px rgba(255,197,61,.55)')}>{label}</button>
              )}
              {card && (
                <div data-practice-card="" role="dialog" aria-label={card.title} style={sx(OVER + ';z-index:8;padding:12px;background:rgba(8,20,30,.78);animation:bh-fade .2s both')}>
                  <div style={sx('max-width:330px;max-height:100%;background:#fff;color:#16303f;border-radius:18px;padding:10px 12px 12px;display:flex;flex-direction:column;align-items:center;gap:7px;overflow:hidden')}>
                    <img src={imageOf(card)} alt={card.title} draggable="false" style={sx('display:block;max-width:100%;min-height:0;flex:0 1 auto;max-height:46%;object-fit:contain;border-radius:8px;background:#f1ece0')} />
                    <b style={sx("font:800 18px/1.1 'Baloo 2',sans-serif;padding-top:2px")}>{card.title}</b>
                    <span style={sx('font-weight:700;font-size:12.5px;line-height:1.35;color:#4f6572')}>In the museum, this opens the whole work: you can read about it, listen to it and give it a sticker.</span>
                    <button data-practice-close="" onClick={() => setCard(null)} style={sx('flex:none;min-height:40px;padding:0 22px;border-radius:999px;background:#16303f;color:#fff;font-weight:900;font-size:14px')}>Close</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
