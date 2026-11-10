# Checks Bayani, the hologram guide, inside the museum: he is not there until he is needed. He greets you when
# you come in, stands quietly beside a work when you stop at it, gives that work's tip when called, fades when
# you walk on, and stays out of the picture while a game room has the camera.
# Usage: python3 tests/e2e/guide.py   (after npm run build; screenshots go to tests/shots/guide/)
import math, re
from playwright.sync_api import sync_playwright
from _common import ROOT, T, GL, served, out_dir, Run, me, fx, place, act, hush

OUT = out_dir('guide')
run = Run()
CONTENT = (ROOT / 'src' / 'museum' / 'content.js').read_text(encoding='utf-8')
def note_of(work):
    """Bayani's tip for a work, as written in src/museum/content.js."""
    m = re.search(r"\{ id: '" + re.escape(work) + r"',.*?\n\s+note: '((?:[^'\\]|\\.)*)'", CONTENT, re.S)
    return m.group(1).replace("\\'", "'")
def guide(pg): return me(pg)['bayani']
def here(pg): pg.wait_for_function(f'{T}.debug().bayani.shown >= 0.95', timeout=30000)
def gone(pg): pg.wait_for_function(f'{T}.debug().bayani.shown === 0', timeout=30000)
def apart(pg): d = me(pg); return math.hypot(d['x'] - d['bayani']['x'], d['z'] - d['bayani']['z'])
def said(pg): return pg.locator('[data-hint]').inner_text() if pg.locator('[data-hint]').count() else ''
def facing(it): return math.atan2(it['center']['x'] - it['spot']['x'], it['center']['z'] - it['spot']['z'])
def stand_at(pg, it): place(pg, it['spot']['x'], it['spot']['z'], facing(it))

with served(port=8817) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    ctx = b.new_context(viewport={'width': 800, 'height': 600}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page(); run.watch(pg)
    shot = lambda n: pg.screenshot(path=str(OUT / f'{n}.png'))
    pg.goto(url); pg.wait_for_timeout(1500)
    pg.click('[data-enter]'); pg.wait_for_timeout(350)
    pg.click('[aria-label="Visit as turtle"]'); pg.click('[data-go]')
    pg.wait_for_function(f'{T} && {T}.ready', timeout=90000); pg.wait_for_timeout(800)
    run.check(guide(pg)['shown'] == 0 and said(pg) == '', 'while the welcome sheet is open, Bayani has not come yet')
    pg.click('text=Start exploring')

    # ---- he greets you as you come in, then goes ----
    here(pg); shot('01-greeting')
    g = guide(pg)
    run.check('Welcome to TANGHALAN' in said(pg), 'closing the welcome: Bayani greets you in the lobby')
    run.check(g['on'] and g['at'] is None and g['room'] == 'lobby' and 0.6 <= apart(pg) <= 2.2, f'his hologram stands beside you ({apart(pg):.1f} m away)')
    hush(pg); gone(pg)
    run.check(said(pg) == '' and not guide(pg)['on'], 'closing what he says sends his hologram away')

    # ---- he stands by a work when you stop at it, without a word ----
    items = {i['id']: i for i in pg.evaluate(f'{T}.debugItems()')}
    place(pg, -9, 3, 0); hush(pg); gone(pg)        # into the Act Fast room, away from the works; close its greeting
    stand_at(pg, items['dch']); here(pg); shot('02-beside-a-work')
    g = guide(pg)
    run.check(g['at'] == 'dch' and g['room'] == 'resp' and 0.6 <= apart(pg) <= 4.2, 'stopping at a drawing: he appears beside it')
    run.check(said(pg) == '', 'and says nothing until he is asked')

    # ---- his button gives the tip for the work you are at ----
    pg.click('[data-bayani]'); pg.wait_for_timeout(500); shot('03-tip-for-this-work')
    run.check(note_of('dch') in said(pg), 'tapping his button: the tip for this drawing (' + note_of('dch')[:40] + '...)')
    run.check(guide(pg)['at'] == 'dch' and guide(pg)['on'], 'he stays beside the drawing while he says it')
    pg.locator('[data-hint] button', has_text='How to explore').click(); pg.wait_for_timeout(450)
    run.check('Ask Bayani' in pg.inner_text('body'), 'How to explore, under his words, opens the welcome sheet again')
    pg.click('text=Start exploring'); pg.wait_for_timeout(400)
    run.check(said(pg) == '', 'the welcome sheet, opened again, does not repeat the greeting')

    # ---- tapping his hologram does the same ----
    here(pg)
    g = guide(pg)
    at = pg.evaluate(f'{T}.screenOf({g["x"]}, 0.95, {g["z"]})')
    pg.mouse.click(at['x'], at['y']); pg.wait_for_timeout(500)
    run.check(note_of('dch') in said(pg), 'tapping the hologram himself gives the tip, too')
    hush(pg); pg.wait_for_timeout(300)
    run.check(guide(pg)['on'], 'closing his words at a work: he stays beside it')

    # ---- he fades when you walk on ----
    pg.keyboard.down('ArrowDown')
    for _ in range(40):
        pg.wait_for_timeout(200)
        if me(pg)['near'] is None: break
    pg.keyboard.up('ArrowDown')
    gone(pg)
    run.check(me(pg)['near'] is None and not guide(pg)['on'], 'walking away from the drawing: he fades')
    shot('04-walked-on')

    # ---- he finds a free spot at every work ----
    bad = []
    for wid, it in items.items():
        if it['type'] != 'work': continue
        stand_at(pg, it); hush(pg)
        try: here(pg)
        except Exception: bad.append(wid + ' (did not appear)'); continue
        g, d = guide(pg), me(pg)
        if not (g['at'] == wid and g['room'] == d['room'] and 0.6 <= apart(pg) <= 4.2): bad.append(f'{wid} ({g})')
    n = len([1 for i in items.values() if i['type'] == 'work'])
    run.check(not bad, f'at each of the {n} works he stands in the same room, off your spot, within reach' + (': ' + '; '.join(bad) if bad else ''))

    # ---- things that are not works do not bring him ----
    pg.evaluate(f'{T}.goTo("lobby")'); pg.wait_for_timeout(400); hush(pg)
    stand_at(pg, items['map']); hush(pg); pg.wait_for_timeout(2500)
    run.check(me(pg)['near'] == 'map' and not guide(pg)['on'], 'at the map board he does not appear on his own')
    pg.click('[data-bayani]'); here(pg); shot('05-called-in-the-lobby')
    run.check('hologram' in said(pg) and guide(pg)['at'] is None, 'called away from any work: he comes to your side with a tip about the museum')
    hush(pg); gone(pg)

    # ---- while a game has the camera or the stick, he stays out of the picture ----
    pg.evaluate(f'{T}.goTo("fireroom")'); pg.wait_for_timeout(500); hush(pg)
    f = fx(pg)
    place(pg, f['ext']['x'], f['ext']['z'], 0); act(pg)
    pg.locator('button:has-text("Take your time")').click(); pg.wait_for_timeout(600)
    place(pg, f['safe']['x'], f['safe']['z'], 'Math.PI'); act(pg); pg.wait_for_timeout(900)
    run.check(me(pg)['aiming'], 'in the Fire Safety Room, holding the extinguisher (PASS view)')
    pg.click('[data-bayani]'); pg.wait_for_timeout(1500); shot('06-pass-view')
    run.check(said(pg) != '' and not guide(pg)['on'] and guide(pg)['shown'] == 0, 'during PASS his words still show, but his hologram stays out of the way')
    pg.evaluate(f'{T}.rooms.fire.exitPass()'); pg.wait_for_timeout(300)
    ctx.close()

    # ---- a phone held upright: he is inside the screen, not cut off at its edge ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page(); run.watch(pg)
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.click('[data-enter]'); pg.wait_for_timeout(350)
    pg.click('[aria-label="Visit as frog"]'); pg.click('[data-go]')
    pg.wait_for_function(f'{T} && {T}.ready', timeout=90000); pg.wait_for_timeout(800)
    pg.click('text=Start exploring'); here(pg); pg.wait_for_timeout(1200); pg.screenshot(path=str(OUT / '07-phone-greeting.png'))
    g = guide(pg); at = pg.evaluate(f'{T}.screenOf({g["x"]}, 0.9, {g["z"]})')
    run.check(30 <= at['x'] <= 360, f'phone: beside you, he is inside the screen (x = {at["x"]:.0f} of 390)')
    hush(pg); gone(pg)
    items = {i['id']: i for i in pg.evaluate(f'{T}.debugItems()')}
    pg.evaluate(f'{T}.goTo("bulwagan")'); pg.wait_for_timeout(400); hush(pg)
    stand_at(pg, items['bayanihan']); hush(pg); here(pg); pg.wait_for_timeout(1500); pg.screenshot(path=str(OUT / '08-phone-beside-the-widest-work.png'))
    g = guide(pg); at = pg.evaluate(f'{T}.screenOf({g["x"]}, 0.9, {g["z"]})')
    run.check(20 <= at['x'] <= 370, f'phone: beside the widest picture, he is inside the screen (x = {at["x"]:.0f} of 390)')
    ctx.close()
    b.close()
run.done()
