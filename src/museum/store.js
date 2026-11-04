// What each visitor has done in TANGHALAN on this device: works seen, rooms visited, stickers given, and
// the best result and badge in each game room. Kept only on this device and sent nowhere.
const KEY = 'tanghalan_museum_v1::';

const empty = () => ({ seen: {}, rooms: {}, stickers: {}, intro: false, games: {} });

export function loadProgress(pid) {
  try {
    const v = JSON.parse(localStorage.getItem(KEY + pid));
    if (v) return { ...empty(), ...v, games: v.games || {} };
  } catch (e) { /* first visit, or storage is off */ }
  return empty();
}

export function saveProgress(pid, p) {
  try { localStorage.setItem(KEY + pid, JSON.stringify(p)); } catch (e) { /* private mode */ }
}

export function forgetProgress(pid) {
  try { localStorage.removeItem(KEY + pid); } catch (e) { /* private mode */ }
}

// the app's settings and who is visiting, also only on this device
const PREFS = 'tanghalan_prefs_v1';
export const defaultPrefs = { sound: true, voice: true, lang: 'fil', visitor: null };
export function loadPrefs() {
  try { return { ...defaultPrefs, ...(JSON.parse(localStorage.getItem(PREFS)) || {}) }; } catch (e) { return { ...defaultPrefs }; }
}
export function savePrefs(p) {
  try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) { /* private mode */ }
}
