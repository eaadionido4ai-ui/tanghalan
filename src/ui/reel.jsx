import { useEffect, useRef, useState } from 'react';
import { sx } from './sx.js';

// The picture carousel on the TANGHALAN and Handaventures cards (Home and Games): a row of pictures that
// snaps to each one and can be swiped. It moves on by itself every few seconds, but never with reduced
// motion, while it is off screen or the app is hidden, or for a while after someone touches it.

const GAP = 10;
const EVERY = 4500; // ms between moves
const HOLD = 9000; // ms it waits after someone uses it
export const calm = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// One picture's place in the row: 16:9, as wide as fits up to 280 px, so the next one peeks in.
export const SLIDE = 'flex:none;position:relative;display:block;width:min(280px,calc(100% - 52px));aspect-ratio:16/9;border-radius:16px;overflow:hidden;scroll-snap-align:start;text-align:left;color:#fff';

export function useReel(count) {
  const reel = useRef(null), hold = useRef(0);
  const [at, setAt] = useState(0);
  const measure = () => {
    const el = reel.current, first = el && el.firstElementChild;
    return first ? { el, step: first.offsetWidth + GAP, max: el.scrollWidth - el.clientWidth } : null;
  };
  const current = (m) => (m.el.scrollLeft >= m.max - 2 ? count - 1 : Math.round(m.el.scrollLeft / m.step));
  const show = (i, byHand) => {
    const m = measure();
    if (!m) return;
    if (byHand) hold.current = Date.now() + HOLD;
    m.el.scrollTo({ left: Math.min(i * m.step, m.max), behavior: calm() ? 'auto' : 'smooth' });
  };
  const busy = () => { hold.current = Date.now() + HOLD; };
  const onScroll = () => { const m = measure(); if (m) setAt(current(m)); };
  useEffect(() => {
    if (calm()) return undefined;
    let onScreen = true;
    const io = typeof IntersectionObserver !== 'undefined' && reel.current ? new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }) : null;
    if (io) io.observe(reel.current);
    const t = setInterval(() => {
      const m = measure();
      if (!m || !onScreen || document.hidden || Date.now() < hold.current) return;
      const i = current(m);
      show(i >= count - 1 ? 0 : i + 1);
    }, EVERY);
    return () => { clearInterval(t); if (io) io.disconnect(); };
  }, []);
  return { reel, at, show, busy, onScroll, count };
}

// The row itself. The card around it has no side padding, so the row starts 18 px in and runs to the edge.
export function Reel({ r, label, children }) {
  return (
    <div ref={r.reel} className="hscroll" role="group" aria-roledescription="carousel" aria-label={label}
      onScroll={r.onScroll} onPointerDown={r.busy} onWheel={r.busy} onFocus={r.busy}
      style={sx('display:flex;gap:' + GAP + 'px;scroll-snap-type:x mandatory;scroll-padding-left:18px;padding:0 0 12px 18px;margin-bottom:-12px')}>
      {children}
      <span aria-hidden="true" style={sx('flex:none;width:8px')} />
    </div>
  );
}

// The dots under the row: one per picture, the current one long and yellow. Each jumps to its picture.
export function ReelDots({ r }) {
  return (
    <span style={sx('display:flex;justify-content:center;align-items:center')}>
      {Array.from({ length: r.count }, (_, i) => (
        <button key={i} onClick={() => r.show(i, true)} aria-label={'Picture ' + (i + 1) + ' of ' + r.count} aria-current={i === r.at ? 'true' : undefined}
          style={sx('width:24px;height:24px;display:flex;align-items:center;justify-content:center')}>
          <span style={sx('display:block;height:7px;border-radius:999px;transition:width .25s ease,background-color .25s ease;' + (i === r.at ? 'width:18px;background-color:#ffd873' : 'width:7px;background-color:rgba(255,255,255,.35)'))} />
        </button>
      ))}
    </span>
  );
}
