// Reads a story aloud one line at a time, so the screen can highlight the line being read.
// Uses a Filipino voice for Filipino text when the device has one.

let job = null;

function voiceFor(lang) {
  try {
    const want = lang === 'fil' ? /^(fil|tl)/i : /^en/i;
    return window.speechSynthesis.getVoices().find((v) => want.test(v.lang)) || null;
  } catch (e) { return null; }
}

export function stopReading() {
  if (job) { job.stopped = true; clearTimeout(job.timer); job = null; }
  try { window.speechSynthesis.cancel(); } catch (e) { /* no speech */ }
}

// onLine(i) when line i starts; onDone() after the last line, or right away when speech is unavailable
export function readLines(lines, lang, onLine, onDone) {
  stopReading();
  const me = { stopped: false, timer: 0 };
  job = me;
  let i = -1;
  const voice = voiceFor(lang);
  const next = () => {
    if (me.stopped) return;
    clearTimeout(me.timer);
    i += 1;
    if (i >= lines.length) { job = null; if (onDone) onDone(); return; }
    const at = i;
    const go = () => { if (i === at) next(); }; // whichever comes first: the end of speech or the timer
    if (onLine) onLine(i);
    let u = null;
    try {
      u = new SpeechSynthesisUtterance(lines[i].replace(/["“”]/g, ''));
      u.rate = 0.9; u.pitch = 1.05;
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = lang === 'fil' ? 'fil-PH' : 'en-US';
      u.onend = go;
      window.speechSynthesis.speak(u);
    } catch (e) { u = null; }
    // keep going even where speech events never arrive
    me.timer = setTimeout(go, (u ? 2200 : 900) + lines[i].length * 85);
  };
  next();
}
