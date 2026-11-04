# Makes the 3D previews of the two game rooms shown on the Home card (src/assets/peek/gobagroom.webp and
# fireroom.webp), with the on-screen buttons hidden. Run it again after changing either room.
# Usage: python3 tests/e2e/peeks.py   (after npm run build; then npm run build again to include them)
from playwright.sync_api import sync_playwright
from PIL import Image
from _common import ROOT, T, GL, served, out_dir, enter, gb, fx, place

OUT = out_dir('peeks')
GB_CAM = (5.7, 2.6, -12.6, 10.0, 0.75, -17.4)     # camera x, y, z, then the point it looks at
FX_CAM = (-11.7, 2.0, -14.6, -8.6, 0.7, -17.9)
def cam(pg, c): pg.evaluate(f'{T}.debugCamera({{x:{c[0]},y:{c[1]},z:{c[2]},lx:{c[3]},ly:{c[4]},lz:{c[5]}}})')
def overlays(pg, show): pg.evaluate("document.querySelectorAll('[data-screen-label] > :not(canvas)').forEach(e => e.style.visibility = '%s')" % ('' if show else 'hidden'))
with served(port=8814) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
    enter(pg, url, 'turtle')
    # the go bag room: a round on the tables, a few things packed, standing at a table
    pg.evaluate(f'{T}.goTo("gobagroom")'); pg.wait_for_timeout(300)
    pg.evaluate(f'{T}.rooms.gobag.start("easy")'); pg.wait_for_timeout(300)
    for x in [x for x in gb(pg)['pieces'] if x['good'] and x['st'] == 't1'][:3]: pg.evaluate(f'{T}.rooms.gobag.pack("{x["id"]}")')
    place(pg, 11.1, -15.4, 'Math.PI*0.92'); pg.wait_for_timeout(900)
    cam(pg, GB_CAM); pg.wait_for_timeout(1200); overlays(pg, False)
    pg.screenshot(path=str(OUT / 'gobagroom.png')); overlays(pg, True)
    pg.evaluate(f'{T}.rooms.gobag.quit()'); pg.evaluate(f'{T}.debugCamera(null)')
    # the fire room: at the safe spot with the extinguisher, spraying the base
    pg.evaluate(f'{T}.goTo("fireroom")'); pg.wait_for_timeout(300)
    pg.evaluate(f'{T}.rooms.fire.pressAlarm()'); pg.wait_for_timeout(400)
    pg.locator('button:has-text("Take your time")').click(); pg.wait_for_timeout(400)
    f = fx(pg)
    place(pg, f['safe']['x'], f['safe']['z'], 'Math.PI')
    pg.evaluate(f'{T}.rooms.fire.enterPass()'); pg.wait_for_timeout(300)
    pg.evaluate(f'{T}.rooms.fire.pull()'); pg.wait_for_timeout(1200)
    pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(900); pg.keyboard.up('ArrowDown')
    pg.evaluate(f'{T}.rooms.fire.squeeze(true)'); pg.wait_for_timeout(500)
    cam(pg, FX_CAM); pg.wait_for_timeout(1300); overlays(pg, False)
    pg.screenshot(path=str(OUT / 'fireroom.png'))
    b.close()
for n in ('gobagroom', 'fireroom'):
    Image.open(OUT / f'{n}.png').convert('RGB').resize((640, 360), Image.LANCZOS).save(ROOT / 'src' / 'assets' / 'peek' / f'{n}.webp', 'WEBP', quality=80, method=6)
    print('wrote src/assets/peek/' + n + '.webp')
