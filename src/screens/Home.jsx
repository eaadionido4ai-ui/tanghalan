import { useState } from 'react';
import { sx } from '../ui/sx.js';
import { Logo } from '../ui/art.jsx';
import { BayaniChip, HoloBayani, HOLO_CARD, HOLO_LABEL, HOLO_BTN, HOLO_BTN_ON } from '../ui/bayani.jsx';
import { VALIDATION, CREDITS } from '../ui/people.jsx';
import { GAMES, TAGLINE, room } from '../museum/content.js';
import { FullName } from './Museum.jsx';
import hero from '../assets/home.webp';

// The home page: one calm screen. It says what TANGHALAN is in a line, gives one way in, and names who made it.
// Everything else waits behind a tap: who is visiting (asked when you enter), the abstract and credits (About),
// the user manual, the walk-through, and Bayani, who comes when called.

const cap = (id) => id[0].toUpperCase() + id.slice(1);
const TIPS_NEW = [
  'Hi! I am Bayani, your hologram guide. Tap Enter the museum, pick an animal, and I will meet you inside.',
  'Inside, walk up to a picture or a story stand. I appear beside it when you stop.',
  'New here? Tap How to play for a short walk-through.',
];
const TIPS_BACK = [
  'Welcome back! Tap Enter the museum and I will meet you inside.',
  'Want to play right away? Pick a game room: pack a go bag, or put out a practice fire.',
  'Sharing this device? Tap Change, so each friend visits as their own animal.',
];

const Gear = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const Arrow = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
);

// visitor: who is visiting, if someone already picked an animal on this device. onEnter(roomId) walks in (the app
// asks who is visiting first when no one has picked yet); onVisitor opens that picker; onSheet opens a sheet.
export function Home({ prefs, visitor, onEnter, onVisitor, onSheet, speak }) {
  const [tip, setTip] = useState(-1); // which of Bayani's lines is showing; -1 when he is not here
  const tips = visitor ? TIPS_BACK : TIPS_NEW;
  const canRead = prefs.sound && prefs.voice;
  const callBayani = () => setTip(tip < 0 ? 0 : -1);

  return (
    <>
      <div className="scroll home">
        <div className="home-in">
          <header className="home-top">
            <Logo size={40} />
            <span className="home-name">TANGHALAN</span>
            <BayaniChip size={46} label="Bayani, your guide" open={tip >= 0} onClick={callBayani} />
            <button className="home-gear" onClick={() => onSheet('settings')} aria-label="Settings"><Gear /></button>
          </header>

          <main className="home-main">
            <div className="home-hero"><img src={hero} alt="Inside TANGHALAN: a visitor in the lobby with Bayani, the hologram guide, at the doorway of the main hall" draggable="false" /></div>
            <div className="home-say">
              <h1>Halika, pasok!</h1>
              <p>{TAGLINE}</p>
              <button className="home-enter" data-enter="" onClick={() => onEnter(null)}>Enter the museum<span><Arrow /></span></button>
              {visitor && (
                <button className="home-who" onClick={onVisitor} aria-label={'Visiting as ' + visitor.id + '. Change the visitor'}>
                  <i style={{ background: visitor.bg }}>{visitor.e}</i>
                  <span>Visiting as <b>{cap(visitor.id)}</b> · <u>Change</u></span>
                </button>
              )}
              <div className="home-rooms">
                Or go straight to a game room
                <div>
                  {['gobag', 'fire'].map((id) => (
                    <button key={id} className="home-pill" onClick={() => onEnter(GAMES[id].room)}><span aria-hidden="true">{GAMES[id].icon}</span>{room(GAMES[id].room).name}</button>
                  ))}
                </div>
              </div>
            </div>
          </main>

          <nav className="home-links" aria-label="More about TANGHALAN">
            <button onClick={() => onSheet('walkthrough')}>How to play</button>
            <button onClick={() => onSheet('manual')}>User manual</button>
            <button onClick={() => onSheet('about')}>About</button>
          </nav>
          <footer className="home-foot">
            <span><FullName accent="#16303f" /></span>
            <span>{CREDITS[0][0]} <b>{CREDITS[0][1]}</b>, UP Resilience Institute</span>
            <span className="home-val">{VALIDATION}</span>
          </footer>
        </div>
      </div>

      {tip >= 0 && (
        <>
          <div onClick={() => setTip(-1)} style={sx('position:absolute;inset:0;z-index:5')} />
          <div className="home-bayani" role="dialog" aria-label="Bayani" style={sx(HOLO_CARD)}>
            <span style={sx('flex:none')}><HoloBayani size={78} wave appear /></span>
            <div style={sx('flex:1;min-width:0;display:flex;flex-direction:column;gap:9px')}>
              <span style={sx(HOLO_LABEL)}>Bayani</span>
              <p key={tip} style={sx('margin:0;font-weight:700;font-size:15px;line-height:1.45;animation:bh-fade .2s both')}>{tips[tip % tips.length]}</p>
              <div style={sx('display:flex;gap:8px;flex-wrap:wrap')}>
                {canRead && <button onClick={() => speak(tips[tip % tips.length])} style={sx(HOLO_BTN)}>Read aloud</button>}
                <button onClick={() => setTip(tip + 1)} style={sx(HOLO_BTN)}>Another tip</button>
                <button onClick={() => setTip(-1)} style={sx(HOLO_BTN_ON)}>Got it</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
