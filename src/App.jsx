import { useEffect, useRef, useState } from 'react';
import { sx, pr } from './ui/sx.js';
import { Logo } from './ui/art.jsx';
import { Credits } from './ui/people.jsx';
import { AV } from './data.js';
import { ABSTRACT, ROOMS, WORKS, GAMES, SAMPLE_NOTE } from './museum/content.js';
import { loadPrefs, savePrefs, loadProgress, forgetProgress } from './museum/store.js';
import { sfx } from './rooms/sfx.js';
import { Home } from './screens/Home.jsx';
import { Museum, Sheet, FullName } from './screens/Museum.jsx';
import { Practice } from './screens/Practice.jsx';
import { usePwa, install, applyUpdate, offlineSupported, oneFile, isIos } from './pwa.js';

// The TANGHALAN app: the home page, the museum, and the sheets over them (who is visiting, settings, about, the
// user manual, and How to play with its practice demo). Everything stays on the device.

const CARD = 'background:#fff;border-radius:22px;padding:15px 16px;display:flex;flex-direction:column;gap:10px';
const ROW = 'display:flex;align-items:center;gap:12px;padding:10px 0';
const SUB = 'display:block;font-weight:700;font-size:13px;line-height:1.4;color:#4f6572';
const DONE = 'flex:none;background:#e5f6ee;color:#0c6b44;border-radius:999px;padding:6px 10px;font-weight:900;font-size:12.5px;white-space:nowrap';
const LABEL = 'font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#4f6572';
const cap = (id) => id[0].toUpperCase() + id.slice(1);

// Installing TANGHALAN and using it with no internet (see src/pwa.js).
function AppCard() {
  const s = usePwa();
  const installSub = s.installed ? 'It is on this device. Open it from your home screen or app list.'
    : s.canInstall ? 'Put TANGHALAN on your home screen and open it like any app.'
      : isIos ? 'In Safari, tap Share, then Add to Home Screen.'
        : oneFile ? 'This copy is one file. Open the web version to install it.'
          : 'In your browser menu, choose Install app or Add to Home screen.';
  const offlineSub = s.offlineReady ? 'Saved on this device. It opens and plays with no internet.'
    : offlineSupported ? 'Saving the museum on this device. Keep the internet on until this says it is saved.'
      : oneFile ? 'This copy is one file with everything inside, so it already works with no internet.'
        : null;
  return (
    <div style={sx(CARD)}>
      <div style={sx(ROW)}>
        <span style={sx('font-size:22px')}>📲</span>
        <span style={sx('flex:1;font-weight:900;font-size:16px')}>Install as an app<span style={sx(SUB)}>{installSub}</span></span>
        {s.installed
          ? <span style={sx(DONE)}>✓ Installed</span>
          : s.canInstall && <button onClick={install} {...pr('flex:none;background:#16303f;color:#fff;border-radius:999px;padding:11px 16px;font-weight:900;font-size:14px;box-shadow:0 4px 0 #0a1822', 'transform:translateY(3px);box-shadow:0 1px 0 #0a1822')}>Install</button>}
      </div>
      {offlineSub && (
        <div style={{ ...sx(ROW), borderTop: '1px solid #eef2f4' }}>
          <span style={sx('font-size:22px')}>📴</span>
          <span style={sx('flex:1;font-weight:900;font-size:16px')}>No internet needed<span style={sx(SUB)}>{offlineSub}</span></span>
          {(s.offlineReady || oneFile) && <span style={sx(DONE)}>✓ Ready</span>}
        </div>
      )}
    </div>
  );
}

// Shown on the home page only (just above its bottom bar), never during a visit, when a newer version has been
// saved on the device.
function UpdateBar({ onUpdate, onLater }) {
  return (
    <div role="status" aria-live="polite" style={sx('position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom, 0px) + 76px);z-index:25;max-width:560px;margin:0 auto;display:flex;align-items:center;gap:8px;background:#16303f;color:#fff;border-radius:20px;padding:8px 8px 8px 16px;box-shadow:0 10px 26px rgba(8,20,30,.38);animation:bh-up .25s ease-out both')}>
      <span style={sx('flex:1;min-width:0;font-weight:800;font-size:14px;line-height:1.35')}>A new version of TANGHALAN is ready.</span>
      <button onClick={onLater} style={sx('flex:none;min-height:44px;padding:0 12px;border-radius:999px;font-weight:900;font-size:13.5px;color:#bcd4e0')}>Later</button>
      <button onClick={onUpdate} style={sx('flex:none;min-height:44px;padding:0 18px;background:#ffd873;color:#4a2a00;border-radius:999px;font-weight:900;font-size:14px')}>Update</button>
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ ...sx('width:56px;height:32px;border-radius:999px;position:relative;flex:none;transition:background .15s'), background: on ? '#1aa46a' : '#c9d6de' }}>
      <span style={{ ...sx('position:absolute;top:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .15s'), left: on ? 27 : 3 }} />
    </button>
  );
}

function SettingsSheet({ prefs, setPrefs, onClose, onAbout }) {
  const visitor = AV.find((a) => a.id === prefs.visitor);
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet onClose={onClose} title="⚙ Settings">
      <div style={sx(CARD)}>
        <div style={sx(ROW)}><span style={sx('font-size:22px')}>🔊</span><span style={sx('flex:1;font-weight:900;font-size:16px')}>Sound<span style={sx('display:block;font-weight:700;font-size:13px;color:#4f6572')}>Sound effects and reading aloud</span></span><Switch label="Sound" on={prefs.sound} onChange={(v) => setPrefs({ ...prefs, sound: v })} /></div>
        <div style={{ ...sx(ROW), borderTop: '1px solid #eef2f4', opacity: prefs.sound ? 1 : 0.5 }}><span style={sx('font-size:22px')}>🗣️</span><span style={sx('flex:1;font-weight:900;font-size:16px')}>Bayani's voice<span style={sx('display:block;font-weight:700;font-size:13px;color:#4f6572')}>Bayani reads his tips aloud</span></span><Switch label="Bayani's voice" on={prefs.voice} onChange={(v) => setPrefs({ ...prefs, voice: v })} /></div>
        <div style={{ ...sx(ROW), borderTop: '1px solid #eef2f4' }}><span style={sx('font-size:22px')}>🌐</span><span style={sx('flex:1;font-weight:900;font-size:16px')}>Works in<span style={sx('display:block;font-weight:700;font-size:13px;color:#4f6572')}>You can switch on each work, too</span></span>
          <span role="group" aria-label="Language" style={sx('display:flex;background:#eef3f6;border-radius:999px;padding:3px;gap:2px')}>
            {[['fil', 'Filipino'], ['en', 'English']].map(([k, t]) => <button key={k} onClick={() => setPrefs({ ...prefs, lang: k })} aria-pressed={prefs.lang === k} style={{ ...sx('padding:6px 12px;border-radius:999px;font-weight:800;font-size:12.5px'), background: prefs.lang === k ? '#16303f' : 'transparent', color: prefs.lang === k ? '#fff' : '#3d5563' }}>{t}</button>)}
          </span>
        </div>
      </div>
      <AppCard />
      {visitor && (
        <div style={sx(CARD)}>
          <div style={sx('font-weight:900;font-size:16px')}>{visitor.e} This visitor's progress</div>
          <div style={sx('font-weight:700;font-size:13.5px;line-height:1.45;color:#4f6572')}>Works seen, rooms visited, stickers, best stars and badges. They are saved only on this device.</div>
          {confirm
            ? <div style={sx('display:flex;gap:10px')}>
              <button onClick={() => setConfirm(false)} style={sx('flex:1;background:#fff;border:2px solid #d5e3ea;border-radius:999px;padding:11px;font-weight:900')}>Keep it</button>
              <button onClick={() => { forgetProgress(visitor.id); setConfirm(false); onClose(); }} style={sx('flex:1;background:#c62f22;color:#fff;border-radius:999px;padding:11px;font-weight:900;box-shadow:0 4px 0 #922a20')}>Yes, start over</button>
            </div>
            : <button onClick={() => setConfirm(true)} style={sx('align-self:flex-start;background:#eef3f6;border-radius:999px;padding:9px 14px;font-weight:900;font-size:14px;color:#a8261a')}>Start this visitor over</button>}
        </div>
      )}
      <button onClick={onAbout} style={sx('align-self:center;background:#fff;border-radius:999px;padding:11px 18px;font-weight:900;font-size:14.5px')}>ℹ️ About TANGHALAN</button>
      <div style={sx('text-align:center;font-weight:700;font-size:12px;color:#9fb6c3')}>TANGHALAN · version {__APP_VERSION__}</div>
    </Sheet>
  );
}

// Who is visiting: asked when someone first taps Enter the museum, and reached again from Change on the home page.
// Visitors are animals, so no names are kept, and each animal has its own progress on this device.
// entering: the visitor was on the way in when asked, so the sheet ends with the way in; otherwise with Done.
function VisitorSheet({ prefs, setPrefs, entering, onClose, onGo }) {
  const visitor = AV.find((a) => a.id === prefs.visitor) || null;
  const progress = Object.fromEntries(AV.map((a) => [a.id, loadProgress(a.id)]));
  const been = (id) => Object.keys(progress[id].rooms).length + Object.keys(progress[id].seen).length > 0;
  const prog = visitor && progress[visitor.id];
  const badges = prog ? ['gobag', 'fire'].filter((g) => prog.games[g] && prog.games[g].badge) : [];
  return (
    <Sheet onClose={onClose} title="Who is visiting?">
      <div style={sx(CARD + ';gap:14px')}>
        <div style={sx('display:grid;grid-template-columns:repeat(4,1fr);gap:8px')}>
          {AV.map((a) => {
            const on = visitor && visitor.id === a.id;
            return (
              <button key={a.id} onClick={() => setPrefs({ ...prefs, visitor: a.id })} aria-pressed={!!on} aria-label={'Visit as ' + a.id}
                style={{ ...sx('position:relative;border-radius:18px;padding:10px 2px 7px;display:flex;flex-direction:column;align-items:center;gap:1px;transition:transform .15s'), background: a.bg, boxShadow: on ? 'inset 0 0 0 4px #16303f' : 'none', transform: on ? 'scale(1.04)' : 'none' }}>
                <span style={sx('font-size:32px;line-height:1.15')}>{a.e}</span>
                <span style={sx('font-weight:900;font-size:12px;color:#16303f')}>{cap(a.id)}</span>
                {been(a.id) && <span aria-hidden="true" style={sx('position:absolute;top:5px;right:5px;width:17px;height:17px;border-radius:50%;background:#16303f;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center')}>✓</span>}
              </button>
            );
          })}
        </div>
        <div aria-live="polite" style={sx('font-weight:800;font-size:13.5px;line-height:1.45;color:#4f6572')}>
          {visitor
            ? <>Visiting as <b style={sx('color:#16303f')}>{visitor.e} {cap(visitor.id)}</b> · {Object.keys(prog.rooms).length} of {ROOMS.length} rooms · {Object.keys(prog.seen).length} of {WORKS.length} works{badges.length ? ' · ' + badges.map((g) => '🏅 ' + GAMES[g].badge[0]).join(' ') : ''}</>
            : 'Pick an animal. Each one keeps its own progress on this device, so classmates can share a tablet. A check mark means that animal has visited before.'}
        </div>
      </div>
      {entering
        ? <button data-go="" disabled={!visitor} onClick={onGo} {...pr("background:#d9650a;color:#fff;font:800 20px 'Baloo 2',sans-serif;padding:13px 24px 10px;border-radius:999px;box-shadow:0 5px 0 #a34a05" + (visitor ? '' : ';opacity:.45'), 'transform:translateY(4px);box-shadow:0 1px 0 #a34a05')}>
          {visitor ? 'Enter the museum as ' + cap(visitor.id) : 'Pick an animal first'}
        </button>
        : <button onClick={onClose} style={sx('background:#16303f;color:#fff;font-weight:900;font-size:16px;padding:13px;border-radius:999px')}>Done</button>}
    </Sheet>
  );
}

// About: what the home page only hints at. The abstract, who made it, notes for grown-ups, and the ways to learn
// how it works.
function AboutSheet({ onClose, onSheet }) {
  return (
    <Sheet onClose={onClose} title="About TANGHALAN">
      <div style={sx(CARD + ';align-items:center;text-align:center')}>
        <Logo size={64} shadow="0 4px 10px rgba(22,48,63,.18)" />
        <div style={sx("font:800 30px/1 'Baloo 2',sans-serif;letter-spacing:2.5px;color:#16303f;padding-top:6px")}>TANGHALAN</div>
        <div style={sx('font-weight:800;font-size:13.5px;line-height:1.45;color:#4f6572')}><FullName accent="#d9650a" /></div>
      </div>
      <div style={sx(CARD)}>
        <b style={sx(LABEL)}>Abstract</b>
        <p style={sx('margin:0;font-weight:700;font-size:14.5px;line-height:1.55;color:#25404e')}>{ABSTRACT}</p>
      </div>
      <div style={sx(CARD + ';align-items:center')}><Credits /></div>
      <div style={sx(CARD)}>
        <b style={sx(LABEL)}>For teachers and parents</b>
        <p style={sx('margin:0;font-weight:700;font-size:14px;line-height:1.5;color:#25404e')}>Short visits work best, ideally two or three children to a device with a grown-up nearby, followed by a short talk: What did you see? How did it make you feel? What will you do? Learners' own works will be added only with their parents' consent and the child's agreement.</p>
        <div style={sx('display:flex;gap:10px;align-items:flex-start;background:#fff1e3;border-radius:16px;padding:12px 14px;font-weight:800;font-size:13px;line-height:1.5;color:#5c3500')}>
          <span style={sx('flex:none;font-size:10.5px;font-weight:900;letter-spacing:.6px;background:#d9650a;color:#fff;border-radius:999px;padding:3px 8px;margin-top:2px')}>SAMPLE</span>
          <span>{SAMPLE_NOTE} Their names, ages and places are made up.</span>
        </div>
        <div style={sx('font-weight:700;font-size:12.5px;line-height:1.5;color:#4f6572')}>🔒 Works offline. No sign-up, no ads, no chat. Each visitor's progress stays on this device (Republic Act No. 10173, the Data Privacy Act of 2012).</div>
      </div>
      <div style={sx('display:flex;gap:10px;flex-wrap:wrap')}>
        <button onClick={() => onSheet('walkthrough')} style={sx('flex:1;background:#fff;border-radius:999px;padding:12px;font-weight:900;font-size:14.5px;white-space:nowrap')}>▶️ How to play</button>
        <button onClick={() => onSheet('manual')} style={sx('flex:1;background:#fff;border-radius:999px;padding:12px;font-weight:900;font-size:14.5px;white-space:nowrap')}>📘 User manual</button>
      </div>
      <button onClick={onClose} style={sx('background:#16303f;color:#fff;font-weight:900;font-size:16px;padding:13px;border-radius:999px')}>Close</button>
    </Sheet>
  );
}

function ManualSheet({ onClose, onWalk }) {
  const parts = [
    ['🚀', 'Getting started', 'Opening TANGHALAN on a phone, tablet or computer, and using it without internet.'],
    ['🐢', 'Visitors and progress', 'Picking an animal, what is saved on the device, and starting over.'],
    ['🏛️', 'Exploring the museum', 'Walking, looking around, the map, reading and listening to works, stickers.'],
    ['🎒', 'The Go Bag Room', 'Taking a bag, looking at things, packing, the weight limit, zipping up, the results.'],
    ['🧯', 'The Fire Safety Room', 'The alarm, the extinguisher, where to stand, P-A-S-S, the safety check.'],
    ['🍎', 'For teachers', 'Fitting a visit into a lesson, talking about it after, and sharing learners\' works with consent.'],
    ['🛠️', 'If something goes wrong', 'No 3D on an older phone, no sound, and other questions.'],
  ];
  return (
    <Sheet onClose={onClose} title="📘 User manual">
      <div style={sx(CARD + ';align-items:center;text-align:center')}>
        <span style={sx('font-size:46px')}>📘</span>
        <div style={sx("font:800 24px/1.1 'Baloo 2',sans-serif;padding-top:3px")}>Coming soon</div>
        <p style={sx('margin:0;font-weight:700;font-size:14.5px;line-height:1.5;color:#4f6572')}>The detailed user manual is being written. It will have these parts. Until then, the short walk-through shows the basics.</p>
        <button onClick={onWalk} {...pr("background:#d9650a;color:#fff;font:800 18px 'Baloo 2',sans-serif;padding:11px 20px 8px;border-radius:999px;box-shadow:0 5px 0 #a34a05", 'transform:translateY(3px);box-shadow:0 2px 0 #a34a05')}>▶️ Open the walk-through</button>
      </div>
      <div style={sx(CARD)}>
        {parts.map(([ic, t, d], i) => (
          <div key={t} style={{ ...sx('display:flex;gap:12px;align-items:center;padding:4px 0'), borderTop: i ? '1px solid #eef2f4' : 'none' }}>
            <span style={sx('width:42px;height:42px;border-radius:13px;background:#eef6fa;display:flex;align-items:center;justify-content:center;font-size:21px;flex:none')}>{ic}</span>
            <span><b style={sx('display:block;font-weight:900;font-size:15px')}>{i + 1}. {t}</b><span style={sx('display:block;font-weight:700;font-size:13px;color:#4f6572;line-height:1.4')}>{d}</span></span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

const WALK = [
  ['🏛️', 'Welcome to TANGHALAN', 'A museum of drawings, stories, poems, comics and letters by kids, about staying safe and helping each other. Tap Enter the museum, pick your animal and come in.'],
  ['🕹️', 'Walk and look around', 'Move with the joystick, or the arrow keys on a computer. Drag the screen to look around and pinch to zoom. Tap the little map to see where you are or to jump to a room. A class on a field trip is visiting too, with their teacher. They make way for you.'],
  ['🖼️', 'Meet the works', 'Walk up to a picture or a story stand and tap Look or Read. Switch between Filipino and English, tap Read it to me, and give a sticker. Bayani, the hologram guide, appears beside each work with a tip. Tap his round button any time you need him.'],
  ['🎒', 'Pack a go bag', 'In the Go Bag Room, take an empty go bag from the packing table. Walk to the tables (on Difficult, open the cabinet, the drawers, the crate and the cooler), tap a thing to look at it, then pack it or leave it. Watch the weight: a heavy bag slows you down. Zip it up when you are ready.'],
  ['🧯', 'Put out a practice fire', 'In the Fire Safety Room, press the fire alarm by the door, then take the extinguisher. Stand a safe distance from the fire with the door behind you, tap Use it here, and do P-A-S-S: Pull the pin, Aim low, Squeeze, Sweep.'],
  ['🍎', 'For grown-ups', 'Visits work best when short and shared. Talk about it after. Progress stays only on this device, and the works on show now are samples.'],
];
// How to play: the practice demo (a corner of the museum to try the controls in, see screens/Practice.jsx), then
// the same things and the rest as written steps. practice is off when How to play is opened during a visit (from
// Settings, then About): the museum itself is right there to practice in.
function WalkSheet({ onClose, practice, visitor, speak, onEnter }) {
  const [i, setI] = useState(0);
  const [ic, t, d] = WALK[i];
  return (
    <Sheet onClose={onClose} title="▶️ How to play">
      {practice && <Practice visitor={visitor} speak={speak} onEnter={onEnter} />}
      <b style={sx('font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#bcd4e0;padding:6px 4px 0')}>Read the steps · Step {i + 1} of {WALK.length}</b>
      <div key={i} style={sx(CARD + ';align-items:center;text-align:center;gap:14px;padding:26px 20px;animation:bh-up .25s ease-out both')}>
        <span style={sx('width:96px;height:96px;border-radius:30px;background:#eef6fa;display:flex;align-items:center;justify-content:center;font-size:52px')}>{ic}</span>
        <div style={sx("font:800 26px/1.1 'Baloo 2',sans-serif;padding-top:3px")}>{t}</div>
        <p style={sx('margin:0;font-weight:700;font-size:16px;line-height:1.55;color:#25404e')}>{d}</p>
      </div>
      <div style={sx('display:flex;justify-content:center;gap:6px')}>{WALK.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={'Step ' + (k + 1)} style={{ ...sx('height:9px;border-radius:999px;transition:width .2s'), width: k === i ? 22 : 9, background: k === i ? '#ffd873' : 'rgba(255,255,255,.35)' }} />)}</div>
      <div style={sx('display:flex;gap:10px')}>
        <button onClick={() => setI(Math.max(0, i - 1))} disabled={!i} style={{ ...sx('flex:1;background:#fff;border-radius:999px;padding:12px;font-weight:900;font-size:15px'), opacity: i ? 1 : 0.4 }}>‹ Back</button>
        {i < WALK.length - 1
          ? <button onClick={() => setI(i + 1)} {...pr("flex:1;background:#d9650a;color:#fff;border-radius:999px;padding:12px;font-weight:900;font-size:15px;box-shadow:0 4px 0 #a34a05", 'transform:translateY(3px);box-shadow:0 1px 0 #a34a05')}>Next ›</button>
          : <button onClick={onClose} {...pr("flex:1;background:#1aa46a;color:#fff;border-radius:999px;padding:12px;font-weight:900;font-size:15px;box-shadow:0 4px 0 #0c7a4a", 'transform:translateY(3px);box-shadow:0 1px 0 #0c7a4a')}>Got it!</button>}
      </div>
    </Sheet>
  );
}

export function App() {
  const [prefs, setPrefsState] = useState(loadPrefs);
  const [screen, setScreen] = useState('home');
  const [sheet, setSheet] = useState(null);
  const [entering, setEntering] = useState(false); // a new visitor was on the way in when asked who is visiting
  const pwa = usePwa();
  const [later, setLater] = useState(false);
  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  const setPrefs = (p) => { setPrefsState(p); savePrefs(p); };
  useEffect(() => { sfx.setOn(prefs.sound); if (!prefs.sound) { try { window.speechSynthesis.cancel(); } catch (e) { /* no speech */ } } }, [prefs.sound]);
  // Bayani's tips, read aloud when Sound and his voice are on
  const speak = (text) => {
    const p = prefsRef.current;
    if (!text || !p.sound || !p.voice) return;
    try {
      const u = new SpeechSynthesisUtterance(text.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ''));
      u.rate = 0.95; u.pitch = 1.1; u.lang = 'en-US';
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
    } catch (e) { /* no speech on this device */ }
  };
  const visitor = AV.find((a) => a.id === prefs.visitor) || null;
  const atHome = screen === 'home' || !visitor;
  const quiet = () => { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } };
  const go = () => { quiet(); setSheet(null); setEntering(false); setScreen('museum'); };
  // the way in: a visitor who is already known walks straight in; a new one is asked who is visiting first
  const enter = () => { quiet(); if (visitor) go(); else { setEntering(true); setSheet('visitor'); } };
  const closeSheet = () => { quiet(); setSheet(null); setEntering(false); };

  return (
    <div style={sx('position:fixed;inset:0;overflow:hidden')}>
      {atHome
        ? <Home prefs={prefs} visitor={visitor} speak={speak} onSheet={setSheet} onEnter={enter} onVisitor={() => { setEntering(false); setSheet('visitor'); }} />
        : <Museum key={visitor.id} visitor={visitor} prefs={prefs} setPrefs={setPrefs} speak={speak}
          sheetOpen={!!sheet} onSettings={() => setSheet('settings')} onExit={() => { quiet(); setScreen('home'); }} />}
      {atHome && !sheet && pwa.updateReady && !later && <UpdateBar onUpdate={applyUpdate} onLater={() => setLater(true)} />}
      {sheet === 'visitor' && <VisitorSheet prefs={prefs} setPrefs={setPrefs} entering={entering} onClose={closeSheet} onGo={go} />}
      {sheet === 'settings' && <SettingsSheet prefs={prefs} setPrefs={setPrefs} onClose={closeSheet} onAbout={() => setSheet('about')} />}
      {sheet === 'about' && <AboutSheet onClose={closeSheet} onSheet={setSheet} />}
      {sheet === 'manual' && <ManualSheet onClose={closeSheet} onWalk={() => setSheet('walkthrough')} />}
      {sheet === 'walkthrough' && <WalkSheet onClose={closeSheet} practice={atHome} visitor={visitor || AV[0]} speak={speak} onEnter={enter} />}
    </div>
  );
}
