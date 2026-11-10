import { LOGO_INNER } from './logo.js';

// The TANGHALAN logo (H4, "Mata"), from src/assets/logo.svg. See logo.js.
export function Logo({ size = 42, shadow = 'none' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="TANGHALAN" style={{ display: 'block', flex: 'none', borderRadius: size * 0.24, boxShadow: shadow }}
      dangerouslySetInnerHTML={{ __html: LOGO_INNER }} />
  );
}

export function Flame({ w }) {
  return (
    <div style={{ position: 'relative', width: w, height: Math.round(w * 1.35), animation: 'bh-flicker 1.4s ease-in-out infinite', transformOrigin: '50% 100%' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%', background: 'linear-gradient(#ffd24d, #ff9d2e 55%, #f2760c)' }} />
      <div style={{ position: 'absolute', left: '28%', right: '28%', bottom: '8%', height: '48%', borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%', background: '#fff6d6' }} />
    </div>
  );
}

export function Dots() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: '#fff', animation: 'bh-dot 1.2s ease-in-out ' + (i * 0.16) + 's infinite' }} />
      ))}
    </div>
  );
}

export function Confetti() {
  const C = ['#f2760c', '#ffc53d', '#1aa46a', '#2a6b8f', '#7a53c6', '#e2382b'];
  const kids = [];
  for (let i = 0; i < 30; i++) {
    const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    kids.push(<span key={i} style={{ position: 'absolute', top: -24, left: (r(1) * 100).toFixed(1) + '%', width: 7 + r(2) * 6, height: 10 + r(3) * 8, borderRadius: r(4) > 0.6 ? '50%' : 2, background: C[i % C.length], animation: 'bh-fall ' + (2.2 + r(5) * 1.8).toFixed(2) + 's linear ' + (r(6) * 0.8).toFixed(2) + 's both' }} />);
  }
  return <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>{kids}</div>;
}
