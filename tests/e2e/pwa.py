# Checks TANGHALAN as an installed app: Chrome finds nothing missing to install it, every file is kept on the
# device, the museum opens and plays with the internet off, and a newer version is offered on the home page and
# replaces the old copy when the visitor taps Update.
# Usage: python3 tests/e2e/pwa.py   (after npm run build; screenshots go to tests/shots/pwa/)
import json, re, shutil, tempfile
from playwright.sync_api import sync_playwright
from _common import T, GL, ROOT, served, out_dir, Run, enter

OUT = out_dir('pwa')
SW = ROOT / 'dist' / 'sw.js'
if not SW.exists():
    raise SystemExit('No dist/sw.js. Run "npm run build" first.')
sw_text = SW.read_text(encoding='utf-8')
files = json.loads(re.search(r'const FILES = (\[.*?\]);', sw_text).group(1))
version = re.search(r'const VERSION = "(\w+)"', sw_text).group(1)

run = Run()
profile = tempfile.mkdtemp(prefix='tanghalan-pwa-')  # a real profile: Chrome will not install from a private window
try:
    with served(port=8815) as url, sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(profile, args=GL, viewport={'width': 390, 'height': 844}, has_touch=True)
        pg = ctx.pages[0] if ctx.pages else ctx.new_page()
        run.watch(pg)
        failed = []
        pg.on('requestfailed', lambda r: failed.append(r.url))
        shot = lambda n: pg.screenshot(path=str(OUT / f'{n}.png'))

        # ---- first visit, with internet ----
        pg.goto(url)
        pg.wait_for_function('navigator.serviceWorker.controller !== null', timeout=90000)
        keys = pg.evaluate('caches.keys()')
        run.check(keys == ['tanghalan-' + version], f'one saved copy, named for this version: {keys}')
        n = pg.evaluate("v => caches.open('tanghalan-' + v).then((c) => c.keys()).then((k) => k.length)", version)
        run.check(n == len(files), f'all {len(files)} files are kept on the device ({n})')

        cdp = ctx.new_cdp_session(pg)
        m = cdp.send('Page.getAppManifest')
        run.check(not m.get('errors'), 'the manifest has no errors' + (': ' + str(m.get('errors')) if m.get('errors') else ''))
        data = json.loads(m['data'])
        run.check(data['name'] == 'TANGHALAN' and data['display'] == 'standalone', 'the manifest names TANGHALAN and opens as an app')
        errs = cdp.send('Page.getInstallabilityErrors')['installabilityErrors']
        run.check(errs == [], 'Chrome finds nothing missing to install it' + (': ' + str(errs) if errs else ''))
        for ic in data['icons']:
            st = pg.evaluate('src => fetch(src).then((r) => r.status)', ic['src'])
            run.check(st == 200, f"icon {ic['src']} ({ic.get('purpose', 'any')}) is there")

        pg.click('[aria-label="Settings"]'); pg.wait_for_timeout(500)
        run.check(pg.locator('text=Saved on this device').count() == 1, 'Settings says the museum is saved on this device')
        shot('1-settings')
        pg.click('[aria-label="Close"]'); pg.wait_for_timeout(300)

        # ---- internet off ----
        ctx.set_offline(True)
        pg.reload(); pg.wait_for_timeout(1500)
        run.check(pg.locator('[data-enter]').count() == 1, 'with no internet: the home page opens')
        shot('2-offline-home')
        bad = pg.evaluate('fs => Promise.all(fs.map((f) => fetch(f).then((r) => (r.ok ? null : f), () => f))).then((a) => a.filter(Boolean))', files)
        run.check(bad == [], 'with no internet: every file of the app still opens' + (': ' + ', '.join(bad[:5]) if bad else ''))
        enter(pg, url, 'fox')
        run.check(pg.evaluate(f'{T}.ready') is True, 'with no internet: the 3D museum loads')
        pg.evaluate(f'{T}.goTo("gobagroom")'); pg.wait_for_timeout(900)
        shot('3-offline-gobag-room')
        pg.evaluate(f'{T}.goTo("fireroom")'); pg.wait_for_timeout(900)
        shot('4-offline-fire-room')
        run.check(not failed, 'with no internet: nothing failed to load' + (': ' + ', '.join(failed[:5]) if failed else ''))

        # ---- a newer version is published ----
        ctx.set_offline(False)
        pg.goto(url); pg.wait_for_timeout(1500)
        run.check(pg.locator('text=A new version').count() == 0, 'no update bar while nothing new is out')
        SW.write_text(sw_text.replace(f'"{version}"', f'"{version}x"'), encoding='utf-8')
        pg.evaluate('navigator.serviceWorker.getRegistration().then((r) => r.update())')
        pg.wait_for_selector('text=A new version of TANGHALAN is ready', timeout=90000)
        pg.wait_for_timeout(500); shot('5-update-ready')
        with pg.expect_navigation(timeout=30000):
            pg.click('button:has-text("Update")')
        pg.wait_for_function('navigator.serviceWorker.controller !== null', timeout=30000)
        pg.wait_for_timeout(1000)
        keys = pg.evaluate('caches.keys()')
        run.check(keys == ['tanghalan-' + version + 'x'], f'after Update: only the new copy is kept: {keys}')
        run.check(pg.locator('text=A new version').count() == 0, 'after Update: the bar is gone')
        shot('6-after-update')
        ctx.close()
finally:
    SW.write_text(sw_text, encoding='utf-8')
    shutil.rmtree(profile, ignore_errors=True)
run.done()
