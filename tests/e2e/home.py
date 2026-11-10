# Checks the home page: one calm screen with one way in, the details behind About, the visitor asked for only
# when someone first enters, Change for sharing a device, the game room shortcuts, and Bayani's card.
# Usage: python3 tests/e2e/home.py   (after npm run build; screenshots go to tests/shots/home/)
from playwright.sync_api import sync_playwright
from _common import T, GL, served, out_dir, Run, me, hush

OUT = out_dir('home')
run = Run()
OLD_NAME = 'bayanihanda'  # the game library this museum was once part of: its name is nowhere on the screens
def words(pg): return pg.inner_text('body')
def sheet(pg): return pg.locator('.scroll').last  # the sheet on top (the home page under it scrolls, too)
def close(pg): pg.click('[aria-label="Close"]'); pg.wait_for_timeout(350)
def in_museum(pg): pg.wait_for_function(f'{T} && {T}.ready', timeout=90000); pg.wait_for_timeout(700)

with served(port=8816) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)

    # ---- a phone, first visit ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page(); run.watch(pg)
    shot = lambda n: pg.screenshot(path=str(OUT / f'{n}.png'))
    pg.goto(url); pg.wait_for_timeout(1500); shot('01-home-first-visit')
    home = words(pg)
    run.check(pg.locator('[data-enter]').count() == 1 and pg.locator('[data-enter]').inner_text().strip() == 'Enter the museum', 'one main button: Enter the museum')
    fits = pg.evaluate("(() => { const e = document.querySelector('.home'); return e.scrollHeight <= e.clientHeight + 1; })()")
    run.check(fits, 'on a phone the whole home page fits one screen, with no scrolling')
    run.check(OLD_NAME not in home.lower(), 'the home page does not name the old game library')
    run.check('runs offline' not in home and 'abstract' not in home.lower(), 'the abstract is not spread on the home page')
    run.check('Edward Andrew A. Dionido' in home and 'with AI assistance' in home, 'the home page names the lead developer, assisted by AI')
    run.check('Disaster Narratives' in home, 'the home page spells out what TANGHALAN stands for')
    run.check(pg.locator('[aria-label^="Visit as"]').count() == 0, 'no animal picker on the home page itself')
    run.check(pg.locator('.home-who').count() == 0, 'first visit: no visitor line yet')
    pic = pg.evaluate("(() => { const i = document.querySelector('.home-hero img'); return i.complete && i.naturalWidth > 0; })()")
    run.check(pic, 'the picture of the lobby loads')

    # About holds what the home page leaves out
    pg.click('.home-links button:has-text("About")'); pg.wait_for_timeout(500); shot('02-about')
    about = words(pg)
    run.check('abstract' in about.lower() and 'runs offline' in about, 'About has the abstract')
    run.check('Edward Andrew A. Dionido' in about and 'Science Research Specialist II' in about, 'About has the credits')
    run.check('for teachers and parents' in about.lower() and 'Republic Act No. 10173' in about, 'About has the notes for grown-ups and the privacy line')
    run.check(OLD_NAME not in about.lower(), 'About does not name the old game library')
    sheet(pg).locator('button', has_text='User manual').click(); pg.wait_for_timeout(450); shot('03-manual')
    run.check('Coming soon' in words(pg), 'the user manual has its place, marked Coming soon')
    sheet(pg).locator('button', has_text='Open the walk-through').click(); pg.wait_for_timeout(450); shot('04-walkthrough')
    run.check('Step 1 of 6' in words(pg), 'the walk-through opens from the manual')
    run.check(OLD_NAME not in words(pg).lower(), 'the walk-through does not name the old game library')
    close(pg)
    pg.click('.home-links button:has-text("How to play")'); pg.wait_for_timeout(450)
    run.check('Step 1 of 6' in words(pg), 'How to play opens the walk-through from the home page')
    close(pg)
    pg.click('.home-links button:has-text("User manual")'); pg.wait_for_timeout(450)
    run.check('Coming soon' in words(pg), 'User manual opens from the home page')
    close(pg)
    pg.click('[aria-label="Settings"]'); pg.wait_for_timeout(450)
    run.check('version 0.2.0' in words(pg) and OLD_NAME not in words(pg).lower(), 'Settings opens from the gear and shows version 0.2.0')
    close(pg)

    # Bayani comes when called, and goes when told
    pg.click('[data-bayani]'); pg.wait_for_timeout(800); shot('05-bayani')
    card = pg.locator('[role="dialog"][aria-label="Bayani"]')
    run.check(card.count() == 1 and 'hologram guide' in card.inner_text(), 'tapping the round button calls Bayani, the hologram guide')
    first = card.locator('p').inner_text()
    card.locator('button', has_text='Another tip').click(); pg.wait_for_timeout(300)
    run.check(card.locator('p').inner_text() != first, 'Another tip gives another tip')
    card.locator('button', has_text='Got it').click(); pg.wait_for_timeout(300)
    run.check(pg.locator('[role="dialog"][aria-label="Bayani"]').count() == 0, 'Got it sends him away')

    # entering asks who is visiting, once
    pg.click('[data-enter]'); pg.wait_for_timeout(500); shot('06-who-is-visiting')
    run.check('Who is visiting?' in words(pg) and pg.locator('[aria-label^="Visit as"]').count() == 8, 'Enter the museum asks who is visiting: 8 animals')
    run.check(pg.locator('[data-go]').is_disabled() and pg.locator('[data-go]').inner_text().strip() == 'Pick an animal first', 'the way in waits until an animal is picked')
    pg.click('[aria-label="Visit as fox"]'); pg.wait_for_timeout(250); shot('07-fox-picked')
    run.check(pg.locator('[data-go]').inner_text().strip() == 'Enter the museum as Fox', 'after picking: Enter the museum as Fox')
    pg.click('[data-go]'); in_museum(pg)
    run.check('Welcome to TANGHALAN' in words(pg), 'a first visit opens with the welcome')
    pg.click('text=Start exploring'); pg.wait_for_timeout(600)
    run.check(me(pg)['room'] == 'lobby', 'walked into the lobby')
    hush(pg)

    # back home: known now, so one tap walks in
    pg.click('[aria-label="Leave the museum"]'); pg.wait_for_timeout(700); shot('08-home-returning')
    run.check('Visiting as Fox' in words(pg), 'back on the home page: Visiting as Fox')
    fits = pg.evaluate("(() => { const e = document.querySelector('.home'); return e.scrollHeight <= e.clientHeight + 1; })()")
    run.check(fits, 'with the visitor line the home page still fits one phone screen')
    pg.click('[data-enter]'); in_museum(pg)
    run.check(pg.locator('text=Who is visiting?').count() == 0 and pg.locator('text=Start exploring').count() == 0, 'a known visitor walks straight in: no picker, no welcome sheet')
    pg.wait_for_timeout(600)
    run.check(pg.locator('[data-hint]').count() == 1 and 'Welcome to TANGHALAN' in pg.locator('[data-hint]').inner_text(), 'Bayani greets a returning visitor in the lobby')
    hush(pg)
    pg.click('[aria-label="Leave the museum"]'); pg.wait_for_timeout(700)

    # Change: another child takes a turn
    pg.click('.home-who'); pg.wait_for_timeout(450); shot('09-change')
    run.check(pg.locator('[data-go]').count() == 0 and sheet(pg).locator('button', has_text='Done').count() == 1, 'Change opens the picker with Done, not a way in')
    run.check(pg.locator('[aria-label="Visit as fox"]').get_attribute('aria-pressed') == 'true', 'the picker shows who is visiting now')
    pg.click('[aria-label="Visit as cat"]'); pg.wait_for_timeout(250)
    sheet(pg).locator('button', has_text='Done').click(); pg.wait_for_timeout(400)
    run.check('Visiting as Cat' in words(pg), 'after Change: Visiting as Cat')

    # straight to a game room
    pg.locator('.home-pill', has_text='Go Bag Room').click(); in_museum(pg)
    pg.click('text=Start exploring'); pg.wait_for_timeout(600)  # the cat is new, so the welcome shows once
    run.check(me(pg)['room'] == 'gobagroom', 'the Go Bag Room button walks straight into that room')
    run.check('Go Bag Room!' in pg.locator('[data-hint]').inner_text(), 'Bayani greets you there with what to do')
    shot('10-straight-to-go-bag-room')
    ctx.close()

    # ---- a new visitor who taps a game room first is asked who is visiting, then goes there ----
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, has_touch=True)
    pg = ctx.new_page(); run.watch(pg)
    pg.goto(url); pg.wait_for_timeout(1200)
    pg.locator('.home-pill', has_text='Fire Safety Room').click(); pg.wait_for_timeout(450)
    pg.click('[aria-label="Visit as whale"]'); pg.wait_for_timeout(250)
    run.check(pg.locator('[data-go]').inner_text().strip() == 'Enter the Fire Safety Room as Whale', 'a new visitor headed to a game room: Enter the Fire Safety Room as Whale')
    pg.click('[data-go]'); in_museum(pg)
    pg.click('text=Start exploring'); pg.wait_for_timeout(600)
    run.check(me(pg)['room'] == 'fireroom', 'and walks into the Fire Safety Room')
    ctx.close()

    # ---- other screens: nothing cut off, the way in always showing ----
    for name, vp in (('small-phone', {'width': 360, 'height': 640}), ('phone-sideways', {'width': 844, 'height': 390}), ('tablet', {'width': 1024, 'height': 768}), ('computer', {'width': 1440, 'height': 900})):
        ctx = b.new_context(viewport=vp, device_scale_factor=1, has_touch=name != 'computer')
        pg = ctx.new_page(); run.watch(pg)
        pg.goto(url); pg.wait_for_timeout(1200); pg.screenshot(path=str(OUT / f'11-{name}.png'))
        bb = pg.locator('[data-enter]').bounding_box()
        run.check(bb['y'] >= 0 and bb['y'] + bb['height'] <= vp['height'], f'{name}: Enter the museum shows without scrolling')
        wide = pg.evaluate("document.documentElement.scrollWidth <= window.innerWidth && document.querySelector('.home').scrollWidth <= document.querySelector('.home').clientWidth")
        run.check(wide, f'{name}: nothing runs off the side')
        ctx.close()
    b.close()
run.done()
