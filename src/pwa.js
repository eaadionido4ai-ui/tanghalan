import { useEffect, useState } from 'react';

// TANGHALAN as an app: keeps the museum on the device (the service worker, dist/sw.js), offers to install it, and
// tells the home page when a newer version is ready. The one-file build and the dev server skip the service worker.

export const offlineSupported = import.meta.env.PROD && import.meta.env.MODE !== 'single'
  && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);
export const oneFile = import.meta.env.MODE === 'single' || (typeof location !== 'undefined' && location.protocol === 'file:');
export const isIos = typeof navigator !== 'undefined'
  && (/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

let state = { offlineReady: false, updateReady: false, canInstall: false, installed: false };
const listeners = new Set();
const set = (patch) => { state = { ...state, ...patch }; listeners.forEach((fn) => fn(state)); };

let installPrompt = null; // the browser's own install offer, kept for the Install button in Settings
let waiting = null;       // a newer version, saved and waiting
let reloadOnSwitch = false;

export function startPwa() {
  if (typeof window === 'undefined') return;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  set({ installed: standalone() });
  window.addEventListener('beforeinstallprompt', (e) => { installPrompt = e; set({ canInstall: true }); });
  window.addEventListener('appinstalled', () => { installPrompt = null; set({ canInstall: false, installed: true }); });
  if (!offlineSupported) return;

  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      if (reg.active) set({ offlineReady: true });
      const offerUpdate = (w) => { waiting = w; set({ updateReady: true }); };
      const watch = (w) => w && w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w);
        if (w.state === 'activated') set({ offlineReady: true });
      });
      if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      watch(reg.installing);
      reg.addEventListener('updatefound', () => watch(reg.installing));
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadOnSwitch) { reloadOnSwitch = false; window.location.reload(); }
      });
      // a tablet may stay open for days: look for a newer version when the app comes back to the front
      let last = Date.now();
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - last > 30 * 60 * 1000) { last = Date.now(); reg.update().catch(() => {}); }
      });
    } catch (e) { /* no service worker here (private mode, or blocked): the app still runs online */ }
  };
  if (document.readyState === 'complete') register(); else window.addEventListener('load', register, { once: true });
}

// Switch to the waiting version and reload once it has taken over.
export function applyUpdate() {
  if (!waiting) { window.location.reload(); return; }
  reloadOnSwitch = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
  setTimeout(() => { if (reloadOnSwitch) window.location.reload(); }, 4000);
}

export async function install() {
  if (!installPrompt) return;
  const p = installPrompt;
  installPrompt = null;
  set({ canInstall: false });
  try {
    await p.prompt();
    const choice = await p.userChoice;
    if (choice && choice.outcome === 'accepted') set({ installed: true });
  } catch (e) { /* the browser said no this time */ }
}

export function usePwa() {
  const [s, setS] = useState(state);
  useEffect(() => { listeners.add(setS); setS(state); return () => { listeners.delete(setS); }; }, []);
  return s;
}
