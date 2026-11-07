import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Makes the web build (npm run build) an app you can install and open with no internet:
// - adds the manifest, the Apple home screen icon and the app-mode tags to index.html, and
// - after the build, writes dist/sw.js: pwa/sw.js with the list of every built file and a version made from
//   their contents, so any change gives a new version and the old copy on devices is replaced.
// The one-file build (npm run build:single) leaves all of this out: that file already opens with no internet.

const SKIP = (f) => f === 'sw.js' || f.endsWith('.woff') || f.endsWith('.map'); // browsers that run this app take .woff2

function walk(dir, base = '') {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((e) => {
    const rel = base ? base + '/' + e.name : e.name;
    return e.isDirectory() ? walk(dir, rel) : [rel];
  });
}

export function pwa() {
  let outDir = 'dist';
  let building = false;
  return {
    name: 'tanghalan-pwa',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      building = config.command === 'build';
    },
    transformIndexHtml() {
      return [
        { tag: 'link', attrs: { rel: 'manifest', href: 'manifest.webmanifest' }, injectTo: 'head' },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: 'apple-touch-icon.png' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'TANGHALAN' }, injectTo: 'head' },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }, injectTo: 'head' },
      ];
    },
    closeBundle() {
      if (!building) return;
      const template = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
      const files = walk(outDir).filter((f) => !SKIP(f)).sort();
      const hash = createHash('sha256').update(template);
      for (const f of files) hash.update(f).update(readFileSync(join(outDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      if (!template.includes("/*VERSION*/'dev'") || !template.includes('/*FILES*/[]')) throw new Error('pwa/plugin.js: pwa/sw.js lost its VERSION or FILES marker');
      const sw = template
        .replace("/*VERSION*/'dev'", JSON.stringify(version))
        .replace('/*FILES*/[]', JSON.stringify(files));
      writeFileSync(join(outDir, 'sw.js'), sw);
      console.log(`sw.js: ${files.length} files kept for offline use, version ${version}`);
    },
  };
}
