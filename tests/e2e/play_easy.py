# Plays both game rooms on Easy, the way a child would: take a go bag, pack the useful things from the
# tables, zip it up; then press the alarm, take the extinguisher, stand at the circle and do P-A-S-S.
# Usage: python3 tests/e2e/play_easy.py   (after npm run build; screenshots go to tests/shots/easy/)
from playwright.sync_api import sync_playwright
from _common import T, GL, served, out_dir, Run, enter, me, gb, fx, place, act, sheet_button, spray

OUT = out_dir('easy')
run = Run()
with served(port=8811) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={'width': 412, 'height': 860}, device_scale_factor=1)
    run.watch(pg)
    shot = lambda name: pg.screenshot(path=str(OUT / f'{name}.png'))
    pg.goto(url); pg.wait_for_timeout(1200); shot('01-home')
    enter(pg, url, 'turtle'); shot('02-museum')

    # ---- the go bag room ----
    pg.evaluate(f'{T}.goTo("gobagroom")'); pg.wait_for_timeout(700); shot('03-gobag-room')
    place(pg, 9, -18.2, 'Math.PI')
    run.check(me(pg)['near'] == 'gb-counter', 'standing at the packing table')
    act(pg); shot('04-choose')
    pg.click('text=On the tables'); pg.wait_for_timeout(700)
    d = gb(pg)
    run.check(d['phase'] == 'packing' and d['level'] == 'easy', 'Easy round started, empty bag on your back')
    spots = {'t1': (6.9, -15.45), 't2': (11.1, -15.45), 't3': (9.0, -13.25)}
    first = True
    for st, (sx_, sz_) in spots.items():
        place(pg, sx_, sz_, 'Math.PI'); pg.wait_for_timeout(300)
        if first: shot('05-at-table')
        for x in [x for x in d['pieces'] if x['st'] == st and x['good']]:
            pg.locator('.hscroll button', has_text=x['name']).first.click(); pg.wait_for_timeout(250)
            if first: shot('06-look-card'); first = False
            pg.click('text=Pack it'); pg.wait_for_timeout(600)
    shot('07-packed')
    d = gb(pg)
    run.check(len(d['packed']) == 9, 'packed the 9 useful things')
    pg.locator('button', has_text='Zip it').first.click()  # the Zip it button on the bag bar
    pg.wait_for_timeout(1200); shot('08-gobag-result')
    run.check('Great packing' in pg.inner_text('body'), 'Easy go bag: 3 stars')
    sheet_button(pg, 'Keep exploring'); pg.wait_for_timeout(400)

    # ---- the fire room ----
    pg.evaluate(f'{T}.goTo("fireroom")'); pg.wait_for_timeout(700); shot('09-fire-room')
    f = fx(pg)
    place(pg, f['alarmSpot']['x'], f['alarmSpot']['z'], 0)
    run.check(me(pg)['near'] == 'fx-alarm', 'standing at the fire alarm')
    act(pg); pg.locator('button:has-text("Take your time")').click(); pg.wait_for_timeout(700)
    f = fx(pg)
    run.check(f['phase'] == 'ready' and f['holding'] and f['alarm'], 'alarm on, extinguisher in hand')
    shot('10-holding')
    place(pg, f['safe']['x'], f['safe']['z'], 'Math.PI'); shot('11-safe-spot')
    act(pg); pg.wait_for_timeout(800); shot('12-pass')
    run.check(fx(pg)['pass'], 'using the extinguisher (PASS view)')
    pg.click('[aria-label="Pull the pin"]'); pg.wait_for_timeout(400)
    secs = spray(pg, shot=lambda: shot('13-spraying'))
    f = fx(pg)
    run.check(f['phase'] == 'won', f'Easy fire put out ({secs} s on this machine)')
    pg.wait_for_timeout(1200); shot('14-fire-result')
    run.check('You put out the fire' in pg.inner_text('body'), 'result says You put out the fire')
    b.close()
run.done()
