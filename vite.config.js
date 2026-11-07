import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { pwa } from './pwa/plugin.js';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// npm run build          -> dist/: a web app for any static host (relative paths, so it also runs from a folder),
//                           installable, and kept on the device by dist/sw.js so it opens with no internet
// npm run build:single   -> dist-single/index.html: one file with everything inside (pictures, fonts, 3D engine),
//                           to share and open with no internet (no install files: it needs none)
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    base: './',
    publicDir: single ? false : 'public',
    plugins: [react(), ...(single ? [viteSingleFile()] : [pwa()])],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    build: {
      target: 'es2019',
      outDir: single ? 'dist-single' : 'dist',
      chunkSizeWarningLimit: 1600,
      assetsInlineLimit: single ? 100000000 : 4096,
      cssCodeSplit: !single,
    },
  };
});
