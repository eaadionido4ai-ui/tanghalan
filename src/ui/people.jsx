import { useId, useState } from 'react';
import { sx } from './sx.js';
import PEOPLE from '../people.json';

// The credits, as in the BAYANIHanda Game Library: the validation notice, then who made it. A person with
// other affiliations (people.json) gets a small cap icon beside the name; tapping it shows or hides them.
export const VALIDATION = 'Subject for code and content validation';
const EA = ['Edward Andrew A. Dionido', 'Science Research Specialist II', 'UPRI'];
export const CREDITS = [['Conceptualized and developed with AI assistance by', ...EA]];

const Cap = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M2 9.5L12 5l10 4.5L12 14z" /><path d="M6.5 11.8V16c1.6 1.4 3.4 2 5.5 2s3.9-.6 5.5-2v-4.2" /><path d="M22 9.5V15" />
  </svg>
);

function Person({ b }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const more = PEOPLE[b[1]];
  return (
    <>
      <span style={sx("display:inline-flex;align-items:center;justify-content:center;gap:2px;font:800 20px/1.15 'Baloo 2',sans-serif;padding-top:3px;color:#16303f")}>
        {b[1]}
        {more && (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls={id} aria-label={'Affiliations of ' + b[1]} title="Affiliations"
            style={sx('flex:none;width:28px;height:28px;margin:-6px -4px -6px 0;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;'
              + (open ? 'background:#e6f3f9;color:#2a6b8f' : 'background:transparent;color:#7a8f9b'))}>
            <Cap />
          </button>
        )}
      </span>
      <span style={sx('font-size:14.5px;font-weight:700;color:#3d5563')}>{b[2]}</span>
      <span style={sx('font-size:14.5px;font-weight:800;color:#3d5563')}>{b[3]}</span>
      {more && (
        <span id={id} style={sx((open ? 'display:flex' : 'display:none') + ';flex-direction:column;align-items:center;gap:1px;margin-top:6px;max-width:300px;padding:8px 12px;border-radius:12px;background:#f4f8fa;border:1.5px solid #dfe9ee;font-size:13px;font-weight:700;line-height:1.35;color:#3d5563')}>
          <span style={sx('font-size:10.5px;font-weight:900;letter-spacing:.8px;text-transform:uppercase;color:#4f6572')}>Affiliations</span>
          {more.map((l, i) => <span key={i} style={i ? undefined : sx('font-weight:900;color:#16303f')}>{l}</span>)}
        </span>
      )}
    </>
  );
}

export function Credits({ blocks = CREDITS }) {
  return (
    <>
      <span style={sx('align-self:center;display:flex;align-items:center;gap:6px;background:#fff5df;border:2px solid #ffe2a8;color:#7a5400;border-radius:999px;padding:5px 12px;font-size:12.5px;font-weight:900;text-align:center')}>🧪 {VALIDATION}</span>
      {blocks.map((b, i) => (
        <div key={i} style={sx('display:flex;flex-direction:column;align-items:center;text-align:center;gap:2px' + (i && b[0] ? ';border-top:2px solid #eef2f4;padding-top:12px' : ''))}>
          {b[0] && <span style={sx('font-size:12px;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#4f6572')}>{b[0]}</span>}
          <Person b={b} />
        </div>
      ))}
    </>
  );
}
