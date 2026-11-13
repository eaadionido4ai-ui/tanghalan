# Checks the class on a field trip in the real museum (src/museum/visitors.js and people.js): a teacher and six
# pupils in three groups, walking from work to work and looking, never in a game room or inside a wall or a piece of
# furniture, and making way when you stop at a work: they leave it to you, and nobody stands against you or between
# you and it. (tests/visitors.test.mjs checks the same rules on a small made-up museum, without a browser.)
# Usage: python3 tests/e2e/visitors.py   (after npm run build; screenshots go to tests/shots/visitors/)
import math, time
from playwright.sync_api import sync_playwright
from _common import T, GL, served, out_dir, Run, enter, me, hush

OUT = out_dir('visitors')
run = Run()
def crowd(pg): return pg.evaluate(f'{T}.debugVisitors()')
def inside(q, boxes, pad=0.05):
    return next((b for b in boxes if b['x0'] - pad < q['x'] < b['x1'] + pad and b['z0'] - pad < q['z'] < b['z1'] + pad), None)
def to_segment(q, a, b):
    """How far q is from the segment a-b, and where along it (0 at a, 1 at b) it is nearest."""
    dx, dz = b['x'] - a['x'], b['z'] - a['z']
    t = max(0.0, min(1.0, ((q['x'] - a['x']) * dx + (q['z'] - a['z']) * dz) / (dx * dx + dz * dz or 1)))
    return math.hypot(q['x'] - (a['x'] + dx * t), q['z'] - (a['z'] + dz * t)), t

with served(port=8819) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={'width': 900, 'height': 640}); run.watch(pg)
    shot = lambda n: pg.screenshot(path=str(OUT / f'{n}.png'))
    enter(pg, url)
    d = crowd(pg)
    people = d['people'] if d else []
    run.check(len(people) == 7, f'seven other visitors are in the museum ({len(people)})')
    run.check(sum(1 for q in people if q['adult']) == 1 and [len(g['members']) for g in d['groups']] == [3, 2, 2],
              'a teacher and six pupils, in groups of three, two and two')
    run.check(any(q['alpha'] > 0.9 and abs(q['x'] - me(pg)['x']) < 9 for q in people), 'some of them are in sight when you come in')
    shot('01-coming-in')

    # ---- watch them, standing out of the way at the lobby door ----
    works = {it['id']: it for it in pg.evaluate(f'{T}.debugItems()') if it['type'] == 'work'}
    start = {q['id']: (q['x'], q['z']) for q in people}
    far = {q['id']: 0.0 for q in people}
    looked, acts, wrong = {g['members'][0]: set() for g in d['groups']}, set(), []
    t0 = time.time()
    while time.time() - t0 < 240 and (min(len(v) for v in looked.values()) < 2 or len(acts & {'talk', 'point'}) < 2):
        d = crowd(pg)
        for q in d['people']:
            acts.add(q['act'])
            far[q['id']] = max(far[q['id']], math.hypot(q['x'] - start[q['id']][0], q['z'] - start[q['id']][1]))
            if not q['room'] or q['gameRoom']: wrong.append(f"{q['id']} in {q['room'] or 'no room'} at ({q['x']:.1f}, {q['z']:.1f})")
            box = inside(q, d['colliders'])
            if box: wrong.append(f"{q['id']} inside a box at ({q['x']:.2f}, {q['z']:.2f})")
        for g in d['groups']:
            if g['looking'] and g['target']: looked[g['members'][0]].add(g['target'])
        pg.wait_for_timeout(400)
    print(f'  (watched for {time.time() - t0:.0f} s)')
    every = set().union(*looked.values())
    run.check(not wrong, 'nobody walks into a game room or out of the rooms, or stands inside a wall or furniture' + (': ' + '; '.join(wrong[:4]) if wrong else ''))
    run.check(all(len(v) >= 2 for v in looked.values()) and every <= set(works),
              'each group stops and looks at one work, then goes on to another (' + '; '.join(f'{k}: ' + ', '.join(sorted(v)) for k, v in looked.items()) + ')')
    run.check(all(v > 1.5 for v in far.values()), 'every one of them walks about (' + ', '.join(f'{k} {v:.1f} m' for k, v in far.items()) + ')')
    run.check({'walk', 'look'} <= acts and {'talk', 'point'} & acts, 'they walk and look, and the teacher talks or a pupil points (' + ', '.join(sorted(acts)) + ')')

    # ---- you stop at the work a group is looking at ----
    for _ in range(100):
        d = crowd(pg)
        g = next((g for g in d['groups'] if g['looking'] and g['target'] in works), None)
        if g: break
        pg.wait_for_timeout(300)
    run.check(g is not None, 'a group is looking at a work')
    w = works[g['target']]
    spot, center = w['spot'], w['center']
    pg.evaluate(f"{T}.place({{ x: {spot['x']}, z: {spot['z']}, yaw: {math.atan2(center['x'] - spot['x'], center['z'] - spot['z'])} }})")
    pg.wait_for_timeout(600); hush(pg)
    run.check(me(pg)['near'] == w['id'], f"you stand at {w['id']}, where {g['members'][0]}'s group is looking")
    t0 = time.time(); left = False
    while time.time() - t0 < 20 and not left:
        left = next(x for x in crowd(pg)['groups'] if x['members'] == g['members'])['target'] != w['id']
        pg.wait_for_timeout(300)
    run.check(left, f"the group leaves {w['id']} to you and goes on to another work")
    pg.wait_for_timeout(2500)  # the time it takes them to step out of your way
    you = {'x': me(pg)['x'], 'z': me(pg)['z']}
    close, between = [], []
    t0 = time.time()
    while time.time() - t0 < 15:
        for q in crowd(pg)['people']:
            if q['act'] == 'walk': continue
            if math.hypot(q['x'] - you['x'], q['z'] - you['z']) < 0.6: close.append(q['id'])
            dd, t = to_segment(q, you, center)
            if dd < 0.4 and 0.1 < t < 0.9: between.append(q['id'])
        pg.wait_for_timeout(300)
    shot('02-at-a-work')
    run.check(not close, 'nobody stands right against you while you look' + (': ' + ', '.join(sorted(set(close))) if close else ''))
    run.check(not between, 'nobody stands between you and the work' + (': ' + ', '.join(sorted(set(between))) if between else ''))

    b.close()
run.done()
