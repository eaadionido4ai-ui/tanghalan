import { useState } from 'react';
import { sx, pr } from '../ui/sx.js';
import { Mascot, Logo } from '../ui/art.jsx';
import { Credits } from '../ui/people.jsx';
import { AV } from '../data.js';
import { ROOMS, WORKS, PEEK_ROOMS, GAMES, room, peekOf, pic } from '../museum/content.js';
import { loadProgress } from '../museum/store.js';
import { SLIDE, useReel, Reel, ReelDots } from '../ui/reel.jsx';
import { FullName } from './Museum.jsx';

// The home page: what TANGHALAN is, who is visiting, the way in, and the about page with the abstract and the
// credits, the user manual (to come) and a short walk-through.

export const ABSTRACT = 'TANGHALAN (Three-dimensional Animated Gallery Highlighting Youth-Generated Artworks, Learnings and Narratives) is a walk-in 3D museum where children\'s drawings, stories, poems, comics and letters about disasters become lessons for other children. Its rooms follow the four thematic areas of the National Disaster Risk Reduction and Management Plan: Stop Hazards Early, Get Ready, Act Fast and Bounce Back. In two game rooms, visitors learn by doing: they pack a go bag in the Go Bag Room, and they press the alarm, take the extinguisher and put out a practice fire in the Fire Safety Room. Every work can be read in Filipino or English and read aloud. TANGHALAN runs offline, keeps each visitor\'s progress only on the device, and is part of the BAYANIHanda Game Library of the University of the Philippines Resilience Institute.';
const TOTAL = WORKS.length;
const DRAWINGS = WORKS.filter((w) => w.kind === 'art');
const FRAME = { bulwagan: '#f0b429', kuwentuhan: '#eaa100', mit: '#2a6b8f', prep: '#128253', resp: '#e8700b', rec: '#7a53c6' };
const CARD = 'background:#fff;border-radius:24px;padding:16px;display:flex;flex-direction:column;gap:12px;box-shadow:0 5px 0 rgba(20,48,66,.08)';
const LABEL = 'font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#4f6572';

// Six pictures for the day: the two game rooms first, then a drawing, a room, a drawing, a room.
function slidesOf(day) {
  const r = (i) => room(PEEK_ROOMS.filter((id) => id !== 'gobagroom' && id !== 'fireroom')[(day * 3 + i) % 5]);
  const w = (i) => DRAWINGS[(day * 2 + i) % DRAWINGS.length];
  return [{ room: room('gobagroom'), play: GAMES.gobag }, { room: room('fireroom'), play: GAMES.fire }, { work: w(0) }, { room: r(0) }, { work: w(1) }, { room: r(1) }];
}

function Slide({ s, onPick }) {
  const chip = 'position:absolute;left:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px;font-weight:900;background:rgba(14,34,51,.82);border-radius:999px;padding:4px 9px';
  if (s.room) {
    const r = s.room;
    return (
      <button onClick={() => onPick(r.id)} aria-label={'Walk into ' + r.name} style={sx(SLIDE + ';box-shadow:0 6px 14px rgba(0,0,0,.35);background:#17344a')}>
        <img src={peekOf(r.id)} alt="" draggable="false" style={sx('display:block;width:100%;height:100%;object-fit:cover')} />
        <span style={sx(chip + ';bottom:8px;max-width:calc(100% - 66px)')}>{r.icon} {r.name}</span>
        <span style={sx('position:absolute;right:8px;bottom:8px;font-size:11px;font-weight:900;background:' + (s.play ? '#1aa46a;color:#fff' : '#ffd873;color:#4a2a00') + ';border-radius:999px;padding:4px 8px')}>{s.play ? '▶ Play' : '3D'}</span>
      </button>
    );
  }
  const w = s.work;
  return (
    <button onClick={() => onPick(w.room)} aria-label={w.title + ', by ' + w.by + ', ' + w.age + '. Walk into its room'}
      style={{ ...sx(SLIDE), background: 'radial-gradient(60% 75% at 50% 0%,rgba(255,224,140,.32),rgba(255,224,140,0)),#17344a' }}>
      <span style={sx('position:absolute;left:0;right:0;top:8px;height:3px;background:#d9b25a')} />
      <span style={{ ...sx('position:absolute;left:50%;top:18px;transform:translateX(-50%);display:block;background:#fdfbf5;padding:4px;box-shadow:0 8px 16px rgba(0,0,0,.45)'), border: '5px solid ' + (FRAME[w.room] || '#f0b429') }}>
        <img src={pic(w.id)} alt="" draggable="false" style={sx('display:block;height:90px;width:auto;max-width:160px')} />
      </span>
      <span style={sx(chip + ';bottom:10px;max-width:calc(100% - 16px)')}>🖍️ {w.title} · {w.by}, {w.age}</span>
    </button>
  );
}

export function Home({ prefs, setPrefs, onEnter, onSheet }) {
  const [slides] = useState(() => slidesOf(Math.floor(Date.now() / 864e5)));
  const reel = useReel(slides.length);
  const visitor = AV.find((a) => a.id === prefs.visitor) || null;
  const prog = visitor ? loadProgress(visitor.id) : null;
  const [ask, setAsk] = useState(false);
  const enter = (roomId) => { if (!visitor) { setAsk(true); return; } onEnter(roomId || null); };
  const badges = prog ? ['gobag', 'fire'].filter((g) => prog.games[g] && prog.games[g].badge) : [];

  return (
    <div className="scroll" style={sx('position:absolute;inset:0;background:#eef6fa')}>
      <div style={sx('background:radial-gradient(120% 90% at 50% 0%,#2a5670,#0e2233);color:#fff;padding:calc(env(safe-area-inset-top, 0px) + 14px) 0 22px')}>
        <div style={sx('max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px')}>
          <div style={sx('display:flex;align-items:center;gap:10px;padding:0 18px')}>
            <Logo size={34} shadow="none" />
            <span style={sx('flex:1;min-width:0;font-weight:800;font-size:12.5px;line-height:1.25;color:#bcd4e0')}>A museum of the<br /><b style={sx('color:#fff;font-weight:900')}>BAYANIHanda Game Library</b></span>
            <button onClick={() => onSheet('settings')} aria-label="Settings" style={sx('width:44px;height:44px;border-radius:14px;background:rgba(255,255,255,.12);font-size:19px;color:#fff')}>⚙</button>
          </div>
          <div style={sx('padding:0 18px;display:flex;gap:12px;align-items:flex-end')}>
            <div style={sx('flex:1;min-width:0')}>
              <div style={sx("font:800 46px/1 'Baloo 2',sans-serif;letter-spacing:2px;color:#ffd873;padding-top:6px")}>TANGHALAN</div>
              <div style={sx('font-weight:800;font-size:13.5px;line-height:1.45;color:#d6e6ee;margin-top:6px')}><FullName accent="#ffc53d" /></div>
            </div>
            <span style={sx('flex:none')}><Mascot size={66} wave bob /></span>
          </div>
          <div style={sx('padding:0 18px;font-weight:800;font-size:16px;line-height:1.45')}>Halika, pasok! A 3D museum of art and stories by kids, with a Go Bag Room and a Fire Safety Room you can play in.</div>
          <Reel r={reel} label="Pictures from TANGHALAN">
            {slides.map((s, i) => <Slide key={i} s={s} onPick={(id) => enter(id)} />)}
          </Reel>
          <ReelDots r={reel} />
        </div>
      </div>

      <div style={sx('max-width:760px;margin:0 auto;padding:16px 16px calc(env(safe-area-inset-bottom, 0px) + 30px);display:flex;flex-direction:column;gap:16px')}>
        <div style={{ ...sx(CARD), boxShadow: ask && !visitor ? '0 0 0 4px #ffc53d' : sx(CARD).boxShadow }}>
          <div style={sx(LABEL)}>Who is visiting?</div>
          <div style={sx('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
            {AV.map((a) => (
              <button key={a.id} onClick={() => { setPrefs({ ...prefs, visitor: a.id }); setAsk(false); }} aria-pressed={visitor && visitor.id === a.id} aria-label={'Visit as ' + a.id}
                style={{ ...sx('aspect-ratio:1;border-radius:20px;font-size:34px;display:flex;align-items:center;justify-content:center;transition:transform .15s'), background: a.bg, boxShadow: visitor && visitor.id === a.id ? 'inset 0 0 0 4px #d9650a' : 'none', transform: visitor && visitor.id === a.id ? 'scale(1.04)' : 'none' }}>{a.e}</button>
            ))}
          </div>
          <div style={sx('font-weight:800;font-size:13.5px;line-height:1.4;color:#4f6572')}>
            {visitor
              ? <>Visiting as <b style={sx('color:#16303f')}>{visitor.e} {visitor.id[0].toUpperCase() + visitor.id.slice(1)}</b> · {Object.keys(prog.rooms).length} of {ROOMS.length} rooms · {Object.keys(prog.seen).length} of {TOTAL} works{badges.length ? ' · ' + badges.map((g) => '🏅 ' + GAMES[g].badge[0]).join(' ') : ''}</>
              : ask ? <b style={sx('color:#a84d04')}>Pick an animal first, then come in!</b> : 'Pick an animal. Each one keeps its own progress on this device, so classmates can share a tablet.'}
          </div>
          <button onClick={() => enter()} {...pr("background:#d9650a;color:#fff;font:800 22px 'Baloo 2',sans-serif;padding:14px 24px 11px;border-radius:999px;box-shadow:0 6px 0 #a34a05", 'transform:translateY(4px);box-shadow:0 2px 0 #a34a05')}>🏛️ Enter the museum</button>
          <div style={sx('display:grid;grid-template-columns:1fr 1fr;gap:10px')}>
            {['gobag', 'fire'].map((id) => {
              const g = GAMES[id], best = prog && prog.games[id];
              return (
                <button key={id} onClick={() => enter(g.room)} {...pr('display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;border-radius:18px;padding:12px;color:#fff;background:' + (id === 'gobag' ? 'linear-gradient(135deg,#1e9c66,#0c5c3a)' : 'linear-gradient(135deg,#e2503b,#a8261a)') + ';box-shadow:0 4px 0 rgba(0,0,0,.2)', 'transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.2)')}>
                  <span style={sx('font-size:26px')}>{g.icon}</span>
                  <b style={sx("font:800 17px/1.1 'Baloo 2',sans-serif;padding-top:2px")}>{room(g.room).name}</b>
                  <span style={sx('font-size:12px;font-weight:800;opacity:.9')}>{best ? 'Best ' + '★'.repeat(best.stars) + '☆'.repeat(3 - best.stars) + (best.badge ? ' · 🏅' : '') : id === 'gobag' ? 'Pack a go bag' : 'Put out a practice fire'}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={sx('display:grid;grid-template-columns:repeat(3,1fr);gap:10px')}>
          {[['walkthrough', '▶️', 'How to play'], ['manual', '📘', 'User manual'], ['about', 'ℹ️', 'About']].map(([k, ic, t]) => (
            <button key={k} onClick={() => onSheet(k)} {...pr('display:flex;flex-direction:column;align-items:center;gap:4px;background:#fff;border-radius:18px;padding:12px 6px;font-weight:900;font-size:13.5px;box-shadow:0 4px 0 rgba(20,48,66,.1)', 'transform:translateY(3px);box-shadow:0 1px 0 rgba(20,48,66,.1)')}>
              <span style={sx('font-size:24px')}>{ic}</span>{t}
            </button>
          ))}
        </div>

        <div style={sx(CARD)}>
          <div style={sx(LABEL)}>About TANGHALAN</div>
          <p style={sx('margin:0;font-weight:700;font-size:14.5px;line-height:1.55;color:#25404e')}>{ABSTRACT}</p>
          <Credits />
          <div style={sx('display:flex;gap:10px;align-items:flex-start;background:#fff1e3;border-radius:16px;padding:12px 14px;font-weight:800;font-size:13px;line-height:1.5;color:#5c3500')}>
            <span style={sx('flex:none;font-size:10.5px;font-weight:900;letter-spacing:.6px;background:#d9650a;color:#fff;border-radius:999px;padding:3px 8px;margin-top:2px')}>SAMPLE</span>
            <span>The works now on show are samples of how the museum is envisioned. Their names, ages and places are made up. Learners' own works, shared with their parents' consent, will replace them.</span>
          </div>
          <div style={sx('font-weight:700;font-size:12.5px;line-height:1.5;color:#4f6572')}>🔒 Works offline. No sign-up, no ads, no chat. Each visitor's progress stays on this device (Republic Act No. 10173, the Data Privacy Act of 2012).</div>
        </div>
      </div>
    </div>
  );
}
