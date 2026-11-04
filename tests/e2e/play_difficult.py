# Plays both game rooms on Difficult and checks what your character does in them: open each container,
# pick things by tapping them in 3D and from the tray, overpack (you walk slower), take things back out
# (they return to where they were), zip up, pack again, stop a round; then the fire: no alarm, aim too high
# until the extinguisher runs out ("Get out!"), practice again with the alarm and good P-A-S-S.
# Also: the map lists the game rooms, and a drawing's "Try it in the ... Room" takes you there.
# Usage: python3 tests/e2e/play_difficult.py   (after npm run build; screenshots go to tests/shots/difficult/)
import time
from playwright.sync_api import sync_playwright
from _common import T, GL, served, out_dir, Run, enter, me, gb, fx, place, act, sheet_button, spray

OUT = out_dir('difficult')
run = Run(); check = run.check
STATION = {'cabinet': 't1', 'drawers': 't2', 'crate': 't3', 'cooler': 'c4'}
with served(port=8812) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={'width': 412, 'height': 860}, device_scale_factor=1)
    run.watch(pg)
    shot = lambda name: pg.screenshot(path=str(OUT / f'{name}.png'))
    enter(pg, url, 'frog')

    # ================= the go bag room, Difficult =================
    pg.evaluate(f'{T}.goTo("gobagroom")'); pg.wait_for_timeout(700)
    place(pg, 9, -18.2, 'Math.PI')
    check(me(pg)['near'] == 'gb-counter', 'standing at the packing table')
    act(pg); pg.click('text=Search the room'); pg.wait_for_timeout(700)
    d = gb(pg)
    check(d['phase'] == 'packing' and d['level'] == 'hard', 'Difficult round started')
    check(all(x['hidden'] for x in d['pieces']), 'all supplies hidden before opening anything')
    check(len(d['pieces']) == 14 and len(d['containers']) == 4, '14 supplies in 4 containers')
    first = True
    for c in d['containers']:
        place(pg, c['x'], c['z'], 'Math.PI')
        check(me(pg)['near'] == 'gb-' + c['kind'], f'standing at the {c["kind"]}')
        if first: shot('01-closed-cabinet')
        act(pg); pg.wait_for_timeout(900)
        mine = [x for x in gb(pg)['pieces'] if x['st'] == STATION[c['kind']]]
        check(all(not x['hidden'] for x in mine), f'{c["kind"]} opened, {len(mine)} things showing')
        shot(f'02-open-{c["kind"]}')
        # the first thing is picked by tapping it in the 3D view, the rest from the tray
        for i, x in enumerate(mine):
            if i == 0:
                sp = pg.evaluate(f'{T}.screenOf({x["wx"]},{x["wy"]}+0.08,{x["wz"]})')
                pg.mouse.click(sp['x'], sp['y']); pg.wait_for_timeout(400)
                tapped = pg.locator(f'[role="dialog"][aria-label="{x["name"]}"]').count() > 0
                check(tapped, f'tapped the {x["name"].lower()} in 3D and its card opened')
                if not tapped:
                    pg.keyboard.press('Escape'); pg.evaluate(f'{T}.rooms.gobag.look("{x["id"]}")'); pg.wait_for_timeout(300)
            else:
                pg.locator('.hscroll button', has_text=x['name']).first.click(); pg.wait_for_timeout(300)
            if first and i == 0: shot('03-look-card'); first = False
            pg.click('text=Pack it'); pg.wait_for_timeout(600)
        if c['kind'] == 'drawers': shot('04-packing-from-drawers')
    d = gb(pg); w = sum(x['weight'] for x in d['pieces'] if x['packed'])
    check(len(d['packed']) == 14, 'packed all 14 things')
    check(me(pg)['speed'] < 1, f'an overpacked bag ({w} of 14) slows you down')
    shot('05-overpacked')
    pg.click('text=👀 Bag'); pg.wait_for_timeout(500); shot('06-bag-sheet')
    for x in [x for x in d['pieces'] if not x['good']]:
        pg.click(f'[aria-label="Take out {x["name"]}"]'); pg.wait_for_timeout(250)
    pg.click('[aria-label="Close"]'); pg.wait_for_timeout(500)
    back = [x for x in gb(pg)['pieces'] if not x['good']]
    check(all((not x['packed']) and x['visible'] and not x['hidden'] for x in back), 'things taken out are back where they were')
    dr = [x for x in back if x['st'] == 't2']
    if dr: check(abs(dr[0]['wz'] + 16.4) < 0.7 and dr[0]['wy'] < 0.9, 'a thing taken out goes back into its drawer')
    check(me(pg)['speed'] == 1, 'under the limit again: normal walking speed')
    place(pg, 9, -18.2, 'Math.PI')
    act(pg); pg.wait_for_timeout(1300)  # Zip it up, at the packing table
    check('Great packing' in pg.inner_text('body'), 'Difficult go bag: 3 stars')
    shot('07-gobag-result')
    sheet_button(pg, 'Pack again'); pg.wait_for_timeout(800)
    d = gb(pg)
    check(d['phase'] == 'packing' and d['level'] == 'hard' and not any(c['open'] for c in d['containers']), 'Pack again: a fresh round, containers closed')
    pg.click('text=👀 Bag'); pg.wait_for_timeout(400); pg.click('text=Stop this round'); pg.wait_for_timeout(600)
    d = gb(pg)
    check(d['phase'] == 'idle' and all(x['st'] in ('t1', 't2', 't3') for x in d['pieces']), 'Stop this round: back to the tables, nothing scored')
    place(pg, 9, -18.2, 'Math.PI')
    check('Take a go bag' in pg.inner_text('[data-action]'), 'the packing table offers a bag again')

    # ================= the fire room, Difficult =================
    pg.evaluate(f'{T}.goTo("fireroom")'); pg.wait_for_timeout(700)
    f = fx(pg)
    place(pg, f['ext']['x'], f['ext']['z'], 0)
    check(me(pg)['near'] == 'fx-ext', 'standing at the extinguisher')
    act(pg); pg.locator('button:has-text("Watch your extinguisher")').click(); pg.wait_for_timeout(700)
    f = fx(pg)
    check(f['phase'] == 'ready' and f['level'] == 'hard' and f['holding'] and not f['alarm'], 'Difficult fire, extinguisher in hand, no alarm yet')
    shot('08-fire-hard-holding')
    place(pg, f['safe']['x'], f['safe']['z'], 'Math.PI')
    act(pg); pg.wait_for_timeout(700)
    check(fx(pg)['pass'], 'using the extinguisher (PASS view)')
    pg.click('[aria-label="Pull the pin"]'); pg.wait_for_timeout(300)
    pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(900); pg.keyboard.up('ArrowDown')
    bb = pg.locator('[aria-label="Squeeze to spray (hold)"]').bounding_box()
    pg.mouse.move(bb['x'] + bb['width'] / 2, bb['y'] + bb['height'] / 2); pg.mouse.down()
    for k in range(8):  # a good start: low and sweeping
        key = 'ArrowLeft' if k % 2 == 0 else 'ArrowRight'
        pg.keyboard.down(key); pg.wait_for_timeout(330); pg.keyboard.up(key)
    low = fx(pg)['st']['intensity']
    pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(1500); pg.keyboard.up('ArrowUp')  # then too high
    shot('09-fire-aim-high')
    mid = top = fx(pg)['st']['intensity']
    t0 = time.time()
    while time.time() - t0 < 60:
        f = fx(pg)
        if f['phase'] != 'ready': break
        top = max(top, f['st']['intensity']); pg.wait_for_timeout(400)
    pg.mouse.up()
    f = fx(pg)
    check(top > mid + 3, f'aiming too high lets the fire grow back ({low:.0f} then {mid:.0f} then {top:.0f})')
    check(f['phase'] == 'empty' and f['st']['agentLeft'] <= 0, 'the extinguisher ran out')
    pg.wait_for_timeout(900)
    check('Get out!' in pg.inner_text('body'), 'result says Get out!')
    shot('10-fire-empty-result')
    sheet_button(pg, 'Practice again'); pg.wait_for_timeout(800)
    f = fx(pg)
    check(f['phase'] == 'ready' and f['level'] == 'hard' and f['holding'] and f['st']['agentLeft'] == 100, 'Practice again: a full extinguisher in hand')
    place(pg, f['alarmSpot']['x'], f['alarmSpot']['z'], 0)
    check(me(pg)['near'] == 'fx-alarm', 'standing at the alarm, extinguisher in hand')
    act(pg); check(fx(pg)['alarm'], 'alarm pressed')
    place(pg, f['safe']['x'], f['safe']['z'], 'Math.PI')
    act(pg); pg.wait_for_timeout(700)
    pg.click('[aria-label="Pull the pin"]'); pg.wait_for_timeout(300)
    secs = spray(pg, shot=lambda: shot('11-fire-hard-spraying'))
    f = fx(pg)
    check(f['phase'] == 'won', f'Difficult fire put out with {f["st"]["agentLeft"]:.0f}% left ({secs} s on this machine)')
    pg.wait_for_timeout(1200); shot('12-fire-hard-result')
    check('You put out the fire' in pg.inner_text('body'), 'result says You put out the fire')
    sheet_button(pg, 'Keep exploring'); pg.wait_for_timeout(500)
    f = fx(pg)
    check(f['phase'] == 'idle' and not f['holding'] and not f['alarm'], 'after the result: extinguisher back on the wall, a new practice fire')

    # ================= the map, and a drawing that leads to a game room =================
    pg.click('[aria-label="Museum map"]'); pg.wait_for_timeout(600)
    body = pg.inner_text('body')
    check('Go Bag Challenge · best ★★★' in body and 'Fire Practice · best' in body, 'the map lists both game rooms with your best stars')
    shot('13-map')
    pg.click('[aria-label="Go to Go Bag Room"]'); pg.wait_for_timeout(700)
    check(me(pg)['room'] == 'gobagroom', 'the map takes you to the Go Bag Room')
    spot = {x['id']: x for x in pg.evaluate(f'{T}.debugItems()')}['sunog']['spot']
    place(pg, spot['x'], spot['z'], 0)
    if me(pg)['near'] != 'sunog': place(pg, spot['x'], spot['z'], 'Math.PI')
    check(me(pg)['near'] == 'sunog', 'standing at the drawing Kapag May Sunog')
    act(pg); pg.wait_for_timeout(500); shot('14-work-sheet')
    pg.locator('button', has_text='Try it in the Fire Safety Room').click(); pg.wait_for_timeout(800)
    check(me(pg)['room'] == 'fireroom', 'Try it in the Fire Safety Room takes you there')
    shot('15-fire-room-from-drawing')
    b.close()
run.done()
