# Shared helpers for the browser checks: serve a built copy of TANGHALAN and open it in Chromium.
# WebGL runs on SwiftShader, so these work on a machine without a graphics card (slowly).
import subprocess, sys, time, os
from pathlib import Path
from contextlib import contextmanager

ROOT = Path(__file__).resolve().parents[2]
T = 'window.__tanghalan'
GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']

def out_dir(name):
    d = ROOT / 'tests' / 'shots' / name
    d.mkdir(parents=True, exist_ok=True)
    return d

@contextmanager
def served(folder=None, port=8811):
    """Serve the built app (dist/ unless another folder is given) on 127.0.0.1."""
    folder = Path(folder or os.environ.get('TANGHALAN_DIST') or ROOT / 'dist')
    if not (folder / 'index.html').exists():
        sys.exit(f'No index.html in {folder}. Run "npm run build" first.')
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=folder,
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(0.8)
    try:
        yield f'http://127.0.0.1:{port}/index.html'
    finally:
        srv.terminate()

class Run:
    """Pass/fail bookkeeping, and the console errors the page printed."""
    def __init__(self): self.fails, self.errors = [], []
    def watch(self, pg):
        pg.on('console', lambda m: self.errors.append(m.text) if m.type == 'error' else None)
        pg.on('pageerror', lambda e: self.errors.append('PAGEERROR ' + str(e)))
    def check(self, ok, what):
        print(('PASS ' if ok else 'FAIL ') + what)
        if not ok: self.fails.append(what)
    def done(self):
        self.check(not self.errors, 'no errors in the console' + (': ' + '; '.join(self.errors[:5]) if self.errors else ''))
        print('FAILED: ' + str(len(self.fails)) if self.fails else 'ALL PASSED')
        sys.exit(1 if self.fails else 0)

def enter(pg, url, avatar='turtle'):
    """Open the app, pick a visitor, walk in and close the welcome."""
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.click(f'[aria-label="Visit as {avatar}"]'); pg.click('text=Enter the museum')
    pg.wait_for_function(f'{T} && {T}.ready', timeout=90000); pg.wait_for_timeout(800)
    pg.click('text=Start exploring'); pg.wait_for_timeout(400)

def me(pg): return pg.evaluate(f'{T}.debug()')
def gb(pg): return pg.evaluate(f'{T}.rooms.gobag.debug()')
def fx(pg): return pg.evaluate(f'{T}.rooms.fire.debug()')
def place(pg, x, z, yaw):
    pg.evaluate(f'{T}.place({{x:{x},z:{z},yaw:{yaw}}})'); pg.wait_for_timeout(650)
def act(pg):
    """Tap the big orange button for the thing you are standing at."""
    pg.click('[data-action]'); pg.wait_for_timeout(450)
def sheet_button(pg, text):
    pg.locator('.scroll button', has_text=text).click()

def spray(pg, run_for=60, shot=None):
    """Aim low, hold Squeeze and sweep with the arrow keys until the round ends. Returns seconds taken."""
    pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(900); pg.keyboard.up('ArrowDown')
    bb = pg.locator('[aria-label="Squeeze to spray (hold)"]').bounding_box()
    pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down()
    t0 = time.time(); k = 0
    while time.time() - t0 < run_for:
        key = 'ArrowLeft' if k % 2 == 0 else 'ArrowRight'
        pg.keyboard.down(key); pg.wait_for_timeout(330); pg.keyboard.up(key); k += 1
        if k == 6 and shot: shot()
        if fx(pg)['phase'] != 'ready': break
    pg.mouse.up()
    return round(time.time() - t0, 1)
