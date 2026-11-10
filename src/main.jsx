import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import './styles.css';
import { App } from './App.jsx';
import { startPwa } from './pwa.js';

// The museum's 3D code (src/museum, src/rooms) uses three.js r128 from window.THREE.
window.THREE = THREE;

// the 3D signs are drawn with these fonts, so load them before anyone walks in
['800 20px "Baloo 2"', '700 20px "Baloo 2"', '900 20px Nunito', '800 20px Nunito', '700 20px Nunito'].forEach((f) => {
  try { document.fonts.load(f); } catch (e) { /* older browsers */ }
});

// keep the museum on this device so it opens with no internet, and offer to install it (see src/pwa.js)
startPwa();

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
