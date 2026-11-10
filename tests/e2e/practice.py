# Checks the practice demo in How to play: a corner of the museum in a piece of the screen where the controls can
# be tried. It starts only when asked, ticks off its five things as each is done, keeps the visitor inside the
# practice room, rests when it is not in sight, saves nothing, and ends with the way in.
# Usage: python3 tests/e2e/practice.py   (after npm run build; screenshots go to tests/shots/practice/)
from playwright.sync_api import sync_playwright
from _common import T, GL, served, out_dir, Run, me, place

OUT = out_dir('practice')
run = Run()
P = '[data-practice]'
SAVED = "Object.keys(localStorage).filter((k) => k.startsWith('tanghalan_museum_v1::')).length"
VISITOR = "(JSON.parse(localStorage.getItem('tanghalan_prefs_v1') || '{}').visitor) || null"
def words(pg): return pg.inner_text('body')
def done(pg): return (pg.locator(P).get_attribute('data-practice-done') or '').split()
def now(pg): return pg.locator('[data-practice-now]').inner_text()
def open_how(pg): pg.click('[data-nav="walkthrough"]'); pg.wait_for_timeout(450)
def start(pg):
    pg.click('[data-practice-start]')
    pg.wait_for_selector('[data-practice="on"]', timeout=90000); pg.wait_for_timeout(600)
def box(pg, what): return pg.locator(what).bounding_box()
def push_stick(pg, dx, dy, until=None, secs=6.0):
    """Hold the practice joystick pushed by (dx, dy) pixels until the test says so, or for this many seconds."""
    b = box(pg, P + ' [data-joystick]'); cx, cy = b['x'] + b['width'] / 2, b['y'] + b['height'] / 2
    pg.mouse.move(cx, cy); pg.mouse.down(); pg.mouse.move(cx + dx, cy + dy, steps=4)
    t = 0.0
    while t < secs:
        pg.wait_for_timeout(150); t += 0.15
        if until and until(): break
    pg.mouse.up(); pg.wait_for_timeout(250)

with served(port=8818) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)

    # ---- a first-time visitor on a phone ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page(); run.watch(pg)
    shot = lambda n: pg.screenshot(path=str(OUT / f'{n}.png'))
    pg.goto(url); pg.wait_for_timeout(1500)
    open_how(pg); shot('01-how-to-play')
    run.check(pg.locator('[data-practice="idle"]').count() == 1 and 'practice demo' in words(pg).lower(), 'How to play opens with the practice demo at the top')
    run.check(pg.locator(P + ' canvas').count() == 0 and pg.evaluate(f'!{T}'), 'opening How to play does not start the 3D museum by itself')
    sec, view = box(pg, P), box(pg, '.practice-view')
    run.check(sec['y'] + sec['height'] <= 844 and view['height'] < 844 * 0.5, 'the practice takes a piece of the screen, not all of it')

    start(pg); shot('02-started')
    d = me(pg)
    run.check(d['room'] == 'bulwagan' and done(pg) == [], 'Start the practice opens a corner of the real museum: the main hall')
    run.check(now(pg) == 'Push the joystick to walk.', 'it says what to try first: Push the joystick to walk')
    run.check(pg.locator(P + ' [data-joystick]').count() == 1 and pg.locator(P + ' [data-bayani]').count() == 1, "the practice has its own joystick and Bayani's button")
    js, vw = box(pg, P + ' [data-joystick]'), box(pg, '.practice-view')
    run.check(js['x'] >= vw['x'] and js['y'] >= vw['y'] and js['x'] + js['width'] <= vw['x'] + vw['width'] and js['y'] + js['height'] <= vw['y'] + vw['height'], 'the joystick sits inside the practice view')

    # 1. the joystick walks
    push_stick(pg, 0, -30, until=lambda: 'walk' in done(pg), secs=8)
    after = me(pg)
    run.check('walk' in done(pg) and after['x'] > d['x'] + 1.0, f"pushing the joystick walks the visitor forward ({after['x'] - d['x']:.1f} m) and ticks Walk")
    shot('03-walked')

    # 2. dragging the view looks around
    c = box(pg, '.practice-view'); x0, y0 = c['x'] + c['width'] * 0.62, c['y'] + c['height'] * 0.4
    pg.mouse.move(x0, y0); pg.mouse.down(); pg.mouse.move(x0 - 70, y0 + 6, steps=6); pg.mouse.move(x0 + 60, y0, steps=6); pg.mouse.up(); pg.wait_for_timeout(500)
    run.check('look' in done(pg) and pg.evaluate(f'{T}.stats().dragged') >= 90, 'dragging the view looks around and ticks Look around')

    # 3. walking up to the picture brings Bayani, and the Look button
    pg.keyboard.down('ArrowUp')
    for _ in range(60):
        pg.wait_for_timeout(150)
        if me(pg)['near']: break
    pg.keyboard.up('ArrowUp')
    pg.wait_for_function(f'{T}.debug().bayani.shown >= 0.9', timeout=30000); pg.wait_for_timeout(300); shot('04-at-the-picture')
    d = me(pg)
    run.check('near' in done(pg) and d['near'] is not None, 'the arrow keys walk too; reaching a picture ticks Walk up to the picture')
    run.check(d['bayani']['at'] == d['near'], 'Bayani the hologram appears beside the picture, as he does in the museum')
    run.check(pg.locator(P + ' [data-action]').count() == 1, 'the Look button shows at the picture')

    # 4. Look opens the picture, in small
    pg.click(P + ' [data-action]'); pg.wait_for_timeout(500); shot('05-look')
    card = pg.locator('[data-practice-card]')
    run.check('open' in done(pg) and card.count() == 1 and 'In the museum' in card.inner_text(), 'tapping Look opens the picture in the practice and ticks Open')
    cb, vw = box(pg, '[data-practice-card] > div'), box(pg, '.practice-view')
    run.check(cb['y'] >= vw['y'] and cb['y'] + cb['height'] <= vw['y'] + vw['height'] + 1, 'the opened picture fits inside the practice view')
    was = me(pg)
    pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(700); pg.keyboard.up('ArrowDown')
    run.check(abs(me(pg)['x'] - was['x']) < 0.01, 'the practice rests while the picture is open')
    pg.click('[data-practice-close]'); pg.wait_for_timeout(400)

    # 5. Bayani's button gives his tip, and that finishes the list
    pg.click(P + ' [data-bayani]'); pg.wait_for_timeout(900); shot('06-bayani-and-done')
    run.check(pg.locator('[data-practice-hint]').count() == 1 and len(pg.locator('[data-practice-hint]').inner_text()) > 20, "tapping Bayani's button shows his tip for the picture")
    run.check(sorted(done(pg)) == sorted(['walk', 'look', 'near', 'open', 'bayani']), 'all five things are ticked: ' + ' '.join(done(pg)))
    run.check(now(pg).startswith('You are ready!') and pg.locator('[data-practice-enter]').count() == 1, 'the practice says You are ready! and offers Enter the museum')
    run.check(pg.locator(P + ' [data-tick][data-on]').count() == 5 and '5 of 5' in words(pg).lower(), 'the five ticks show as done')

    # the visitor stays in the practice room: no doorway leads out
    place(pg, 0, -0.9, 0); pg.wait_for_timeout(300)        # by the doorway to the lobby, facing it
    pg.keyboard.down('ArrowUp'); pg.wait_for_timeout(2500); pg.keyboard.up('ArrowUp'); pg.wait_for_timeout(200)
    d = me(pg)
    run.check(d['room'] == 'bulwagan' and d['z'] <= -0.4, f"walking at a doorway does not leave the practice room (stopped at z = {d['z']:.2f})")

    run.check(pg.evaluate(SAVED) == 0 and pg.evaluate(VISITOR) is None, 'nothing done in the practice is saved: no visitor, no progress')

    # the way in from the practice: a new visitor is asked who is visiting, and the practice is put away
    pg.click('[data-practice-enter]'); pg.wait_for_timeout(600)
    run.check('Who is visiting?' in words(pg) and pg.locator(P).count() == 0 and pg.evaluate(f'!{T}'), 'Enter the museum closes the practice and asks a new visitor who is visiting')
    pg.click('[aria-label="Visit as cat"]'); pg.click('[data-go]')
    pg.wait_for_function(f'{T} && {T}.ready', timeout=90000); pg.wait_for_timeout(600)
    welcome = 'Welcome to TANGHALAN' in words(pg)
    pg.click('text=Start exploring'); pg.wait_for_timeout(600)
    run.check(welcome and me(pg)['room'] == 'lobby', 'and then the real visit starts in the lobby, with the welcome')
    ctx.close()

    # ---- someone who has visited before: their progress is left alone, and closing puts the practice away ----
    ctx = b.new_context(viewport={'width': 1024, 'height': 768}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page(); run.watch(pg)
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.click('[data-enter]'); pg.wait_for_timeout(350)
    pg.click('[aria-label="Visit as fox"]'); pg.click('[data-go]')
    pg.wait_for_function(f'{T} && {T}.ready', timeout=90000); pg.wait_for_timeout(700)
    pg.click('text=Start exploring'); pg.wait_for_timeout(500)
    # during a visit, How to play (Settings, About) has the written steps only: the museum itself is there to practice in
    pg.click('[aria-label="Settings"]'); pg.wait_for_timeout(400)
    pg.locator('.scroll').last.locator('button', has_text='About TANGHALAN').click(); pg.wait_for_timeout(400)
    pg.locator('.scroll').last.locator('button', has_text='How to play').click(); pg.wait_for_timeout(400)
    run.check(pg.locator(P).count() == 0 and 'step 1 of 6' in words(pg).lower(), 'opened during a visit, How to play shows the written steps without the practice')
    pg.click('[aria-label="Close"]'); pg.wait_for_timeout(400)
    run.check(me(pg)['room'] == 'lobby', 'and the visit carries on after it is closed')
    pg.click('[aria-label="Leave the museum"]'); pg.wait_for_timeout(700)
    saved = pg.evaluate("localStorage.getItem('tanghalan_museum_v1::fox')")
    open_how(pg); start(pg)
    pg.keyboard.down('ArrowUp')
    for _ in range(60):
        pg.wait_for_timeout(150)
        if me(pg)['near']: break
    pg.keyboard.up('ArrowUp')
    pg.wait_for_function(f'{T}.debug().bayani.shown >= 0.9', timeout=30000); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / '07-tablet.png'))
    # tapping the picture itself opens it, too
    it = next(i for i in pg.evaluate(f'{T}.debugItems()') if i['id'] == me(pg)['near'])
    at = pg.evaluate(f"{T}.screenOf({it['center']['x']}, 1.7, {it['center']['z']})")
    pg.mouse.click(at['x'], at['y']); pg.wait_for_timeout(500)
    run.check(pg.locator('[data-practice-card]').count() == 1, 'tapping the picture itself opens it, too')
    pg.click('[data-practice-close]'); pg.wait_for_timeout(300)
    run.check(pg.evaluate("localStorage.getItem('tanghalan_museum_v1::fox')") == saved, "the practice left the fox's saved progress exactly as it was")
    pg.click('[aria-label="Close"]'); pg.wait_for_timeout(500)
    run.check(pg.locator(P).count() == 0 and pg.evaluate(f'!{T}') and pg.locator('[data-enter]').count() == 1, 'closing How to play puts the practice away and shows the home page')
    ctx.close()

    # ---- a phone held sideways and a small phone: the whole practice fits the screen ----
    for name, vp in (('phone-sideways', {'width': 844, 'height': 390}), ('small-phone', {'width': 360, 'height': 640})):
        ctx = b.new_context(viewport=vp, device_scale_factor=1, has_touch=True)
        pg = ctx.new_page(); run.watch(pg)
        pg.goto(url); pg.wait_for_timeout(1200)
        open_how(pg); start(pg)
        push_stick(pg, 0, -30, until=lambda: me(pg)['near'], secs=8)
        pg.wait_for_function(f'{T}.debug().bayani.shown >= 0.9', timeout=30000); pg.wait_for_timeout(300)
        pg.screenshot(path=str(OUT / f'08-{name}.png'))
        sec, js, look = box(pg, P), box(pg, P + ' [data-joystick]'), box(pg, P + ' [data-action]')
        run.check(sec['y'] >= 0 and sec['y'] + sec['height'] <= vp['height'], f'{name}: the whole practice fits the screen with no scrolling')
        run.check(js['y'] + js['height'] <= vp['height'] and look['y'] + look['height'] <= vp['height'] and look['x'] >= js['x'] + js['width'], f'{name}: the joystick and the Look button are both in reach and apart')
        if name == 'small-phone':
            # it rests while most of it is scrolled off the screen (reading the written steps), and carries on after
            SCROLL = "document.querySelectorAll('.scroll')[document.querySelectorAll('.scroll').length - 1].scrollTo(0, %d)"
            pg.evaluate(SCROLL % 99999); pg.wait_for_timeout(600)
            top = box(pg, '[aria-label="Close"]'); v = box(pg, '.practice-view')
            seen = max(0, v['y'] + v['height'] - (top['y'] + top['height'])) / v['height']
            was = me(pg)
            pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(800); pg.keyboard.up('ArrowDown')
            run.check(seen < 0.5 and abs(me(pg)['x'] - was['x']) < 0.01, f'{name}: scrolled down to the written steps ({seen:.0%} of the view left in sight), the practice rests')
            pg.evaluate(SCROLL % 0); pg.wait_for_timeout(600)
            pg.keyboard.down('ArrowDown'); pg.wait_for_timeout(900); pg.keyboard.up('ArrowDown')
            run.check(abs(me(pg)['x'] - was['x']) > 0.2, f'{name}: scrolled back, it carries on')
        ctx.close()

    # ---- a device that cannot show 3D: the practice says so, and the written steps are still there ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page()  # not watched: three.js itself reports the missing WebGL on the console
    pg.add_init_script("HTMLCanvasElement.prototype.getContext = function () { return null; };")
    pg.goto(url); pg.wait_for_timeout(1200)
    open_how(pg); pg.click('[data-practice-start]'); pg.wait_for_timeout(900)
    pg.screenshot(path=str(OUT / '09-no-3d.png'))
    run.check(pg.locator('[data-practice="failed"]').count() == 1 and 'cannot run on this device' in words(pg), 'with no 3D on the device, the practice says it cannot run here')
    run.check('step 1 of 6' in words(pg).lower(), 'and the written steps are still there to read')
    ctx.close()
    b.close()
run.done()
