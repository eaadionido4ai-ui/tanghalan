# Makes the picture on the home page (src/assets/home.webp): the lobby as you walk in, with the museum's name over
# the main doorway, a visitor on the way in and Bayani the hologram guide waving beside them. The on-screen
# buttons are hidden for the picture. Run it again after changing the lobby, the logo or Bayani.
# Usage: python3 tests/e2e/home_picture.py   (after npm run build; then npm run build again to include it)
from playwright.sync_api import sync_playwright
from PIL import Image
from _common import ROOT, T, GL, served, out_dir, enter, place

OUT = out_dir('home-picture')
STAND = (-0.5, 2.2)                            # where the visitor stands, facing the main doorway
CAM = (-1.25, 1.55, 5.7, 0.35, 1.95, 0.0)      # camera x, y, z, then the point it looks at
with served(port=8814) as url, sync_playwright() as p:
    b = p.chromium.launch(args=GL)
    pg = b.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1)
    enter(pg, url, 'fox')
    place(pg, STAND[0], STAND[1], 'Math.PI')
    pg.evaluate(f'{T}.debugCamera({{x:{CAM[0]},y:{CAM[1]},z:{CAM[2]},lx:{CAM[3]},ly:{CAM[4]},lz:{CAM[5]}}})'); pg.wait_for_timeout(900)
    pg.evaluate(f'{T}.callBayani()')
    pg.wait_for_function(f'{T}.debug().bayani.shown >= 0.99', timeout=20000); pg.wait_for_timeout(250)
    pg.evaluate("document.querySelectorAll('[data-screen-label] > :not(canvas)').forEach(e => e.style.visibility = 'hidden')")
    pg.screenshot(path=str(OUT / 'home.png'))
    b.close()
Image.open(OUT / 'home.png').convert('RGB').resize((960, 540), Image.LANCZOS).save(ROOT / 'src' / 'assets' / 'home.webp', 'WEBP', quality=82, method=6)
print('wrote src/assets/home.webp')
