# Screenshots of TANGHALAN on a tablet and on a phone held sideways, in both game rooms, to check that the
# bars, the tray of things, Bayani's hints and the P-A-S-S buttons do not cover each other.
# Usage: python3 tests/e2e/layouts.py   (after npm run build; screenshots go to tests/shots/layouts/)
from playwright.sync_api import sync_playwright
from _common import T, GL, served, out_dir, Run, enter, fx, place, act

OUT = out_dir('layouts')
run = Run()
with served(port=8813) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    for name, vp in (('phone', {'width': 390, 'height': 844}), ('tablet', {'width': 1024, 'height': 768}), ('phone-sideways', {'width': 844, 'height': 390})):
        ctx = b.new_context(viewport=vp, device_scale_factor=1, has_touch=True)
        pg = ctx.new_page(); run.watch(pg)
        shot = lambda n: pg.screenshot(path=str(OUT / f'{name}-{n}.png'))
        pg.goto(url); pg.wait_for_timeout(1200); shot('1-home')
        enter(pg, url, 'cat')
        pg.evaluate(f'{T}.goTo("gobagroom")'); pg.wait_for_timeout(500)
        place(pg, 9, -18.2, 'Math.PI'); act(pg); shot('2-choose')
        pg.click('text=On the tables'); pg.wait_for_timeout(600)
        place(pg, 11.1, -15.45, 'Math.PI'); pg.wait_for_timeout(300); shot('3-table')
        run.check(pg.locator('.hscroll button').count() == 5, f'{name}: the tray shows the 5 things on the table')
        pg.locator('button', has_text='Zip it').first.click(); pg.wait_for_timeout(1000)
        pg.locator('.scroll button', has_text='Keep exploring').click(); pg.wait_for_timeout(300)
        pg.evaluate(f'{T}.goTo("fireroom")'); pg.wait_for_timeout(500)
        f = fx(pg)
        place(pg, f['ext']['x'], f['ext']['z'], 0); act(pg)
        pg.locator('button:has-text("Take your time")').click(); pg.wait_for_timeout(600)
        place(pg, f['safe']['x'], f['safe']['z'], 'Math.PI'); act(pg); pg.wait_for_timeout(800)
        shot('4-pass')
        pg.click('[aria-label="Pull the pin"]'); pg.wait_for_timeout(300)
        pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(900); pg.keyboard.up('ArrowDown')
        pg.keyboard.down('Space'); pg.wait_for_timeout(1500); shot('5-spray'); pg.keyboard.up('Space')
        run.check(fx(pg)['st']['spraying'] is False and fx(pg)['st']['intensity'] < 100, f'{name}: the Space key sprays')
        ctx.close()
    b.close()
run.done()
