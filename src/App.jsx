import { useEffect, useRef, useState } from 'react';
import { sx, pr } from './ui/sx.js';
import { Mascot, Logo } from './ui/art.jsx';
import { Credits } from './ui/people.jsx';
import { AV } from './data.js';
import { loadPrefs, savePrefs, forgetProgress } from './museum/store.js';
import { sfx } from './rooms/sfx.js';
import { Home, ABSTRACT } from './screens/Home.jsx';
import { Museum, Sheet, FullName } from './screens/Museum.jsx';

// The standalone TANGHALAN app: the home page, the museum, and the sheets over them (settings, about, the
// user manual and the walk-through). Everything stays on the device.

const CARD = 'background:#fff;border-radius:22px;padding:15px 16px;display:flex;flex-direction:column;gap:10px';
const ROW = 'display:flex;align-items:center;gap:12px;padding:10px 0';

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
      <div style={sx('text-align:center;font-weight:700;font-size:12px;color:#9fb6c3')}>TANGHALAN standalone · version {__APP_VERSION__}</div>
    </Sheet>
  );
}

function AboutSheet({ onClose }) {
  return (
    <Sheet onClose={onClose} title="ℹ️ About TANGHALAN">
      <div style={sx(CARD + ';align-items:center;text-align:center')}>
        <Logo size={56} />
        <div style={sx("font:800 32px/1 'Baloo 2',sans-serif;letter-spacing:1.5px;color:#d9650a;padding-top:4px")}>TANGHALAN</div>
        <div style={sx('font-weight:800;font-size:13.5px;line-height:1.45;color:#4f6572')}><FullName accent="#d9650a" /></div>
      </div>
      <div style={sx(CARD)}>
        <b style={sx('font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#4f6572')}>Abstract</b>
        <p style={sx('margin:0;font-weight:700;font-size:14.5px;line-height:1.55;color:#25404e')}>{ABSTRACT}</p>
      </div>
      <div style={sx(CARD + ';align-items:center')}><Credits /></div>
      <div style={sx(CARD)}>
        <b style={sx('font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#4f6572')}>Where the game rooms come from</b>
        <p style={sx('margin:0;font-weight:700;font-size:14px;line-height:1.5;color:#25404e')}>The Go Bag Room and the Fire Safety Room bring two games of the BAYANIHanda Game Library into the museum: Go Bag Packing 3D and Fire Extinguisher 3D. Their items, notes, rules and stars are the same; here your own character does the packing and holds the extinguisher.</p>
      </div>
      <div style={sx(CARD)}>
        <b style={sx('font-size:12px;font-weight:900;letter-spacing:1.2px;text-transform:uppercase;color:#4f6572')}>For teachers and parents</b>
        <p style={sx('margin:0;font-weight:700;font-size:14px;line-height:1.5;color:#25404e')}>Short visits work best, ideally two or three children to a device with a grown-up nearby, followed by a short talk: What did you see? How did it make you feel? What will you do? The works now on show are samples. Learners' own works will be added only with their parents' consent and the child's agreement.</p>
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
  ['🏛️', 'Welcome to TANGHALAN', 'A museum of drawings, stories, poems, comics and letters by kids, about staying safe and helping each other. Pick your animal on the home page and come in.'],
  ['🕹️', 'Walk and look around', 'Move with the joystick, or the arrow keys on a computer. Drag the screen to look around and pinch to zoom. Tap the little map to see where you are or to jump to a room.'],
  ['🖼️', 'Meet the works', 'Walk up to a picture or a story stand and tap Look or Read. Switch between Filipino and English, tap Read it to me, and give a sticker. Bayani adds a tip to every work.'],
  ['🎒', 'Pack a go bag', 'In the Go Bag Room, take an empty go bag from the packing table. Walk to the tables (on Difficult, open the cabinet, the drawers, the crate and the cooler), tap a thing to look at it, then pack it or leave it. Watch the weight: a heavy bag slows you down. Zip it up when you are ready.'],
  ['🧯', 'Put out a practice fire', 'In the Fire Safety Room, press the fire alarm by the door, then take the extinguisher. Stand a safe distance from the fire with the door behind you, tap Use it here, and do P-A-S-S: Pull the pin, Aim low, Squeeze, Sweep.'],
  ['🍎', 'For grown-ups', 'Visits work best when short and shared. Talk about it after. Progress stays only on this device, and the works on show now are samples.'],
];
function WalkSheet({ onClose }) {
  const [i, setI] = useState(0);
  const [ic, t, d] = WALK[i];
  return (
    <Sheet onClose={onClose} title="▶️ How to play" sub={'Step ' + (i + 1) + ' of ' + WALK.length}>
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
  const [startRoom, setStartRoom] = useState(null);
  const [sheet, setSheet] = useState(null);
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
  const visitor = AV.find((a) => a.id === prefs.visitor);

  return (
    <div style={sx('position:fixed;inset:0;overflow:hidden')}>
      {screen === 'home' || !visitor
        ? <Home prefs={prefs} setPrefs={setPrefs} onSheet={setSheet} onEnter={(roomId) => { setStartRoom(roomId); setScreen('museum'); }} />
        : <Museum key={visitor.id + ':' + (startRoom || '')} visitor={visitor} prefs={prefs} setPrefs={setPrefs} speak={speak} startRoom={startRoom}
          sheetOpen={!!sheet} onSettings={() => setSheet('settings')} onExit={() => { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } setScreen('home'); }} />}
      {sheet === 'settings' && <SettingsSheet prefs={prefs} setPrefs={setPrefs} onClose={() => setSheet(null)} onAbout={() => setSheet('about')} />}
      {sheet === 'about' && <AboutSheet onClose={() => setSheet(null)} />}
      {sheet === 'manual' && <ManualSheet onClose={() => setSheet(null)} onWalk={() => setSheet('walkthrough')} />}
      {sheet === 'walkthrough' && <WalkSheet onClose={() => setSheet(null)} />}
    </div>
  );
}

export { Mascot };
