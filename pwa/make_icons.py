# Makes the app icons in public/ from public/icon.svg (logo H4, "Mata"), and puts the same logo in the browser tab
# icon inside index.html. Run it again whenever public/icon.svg changes.
# Usage: python3 pwa/make_icons.py   (Python 3 with Playwright: pip install playwright, then playwright install chromium)
import base64, re
from pathlib import Path
from urllib.parse import quote
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PUB = ROOT / 'public'
SRC = (PUB / 'icon.svg').read_text(encoding='utf-8')
TILE = '<rect width="100" height="100" rx="24" fill="#fbf6ea"/>'


def full_bleed(scale):
    """The logo on a plain square with no rounded corners, for icons that the phone crops to its own shape.
    A scale below 1 keeps the room inside the circle Android may crop to (the middle 80 percent)."""
    assert TILE in SRC, 'public/icon.svg changed its background tile: update TILE in pwa/make_icons.py'
    body = SRC.replace(TILE, '<rect width="100" height="100" fill="#fbf6ea"/>\n  <g transform="translate(50 50) scale(%s) translate(-50 -50)">' % scale)
    return body.replace('</svg>', '  </g>\n</svg>')


ICONS = [  # file, size in pixels, picture, see-through corners
    ('icon-192.png', 192, SRC, True),
    ('icon-512.png', 512, SRC, True),
    ('icon-maskable-512.png', 512, full_bleed(0.84), False),  # 0.84 keeps the eye's corner tips inside the circle
    ('apple-touch-icon.png', 180, full_bleed(1), False),
]

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, size, svg, clear in ICONS:
        pg = b.new_page(viewport={'width': size, 'height': size}, device_scale_factor=1)
        uri = 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')
        pg.set_content(f'<html><body style="margin:0;background:transparent"><img src="{uri}" width="{size}" height="{size}" style="display:block"></body></html>')
        pg.wait_for_timeout(150)
        pg.screenshot(path=str(PUB / name), omit_background=clear)
        pg.close()
        print('made public/' + name)
    b.close()

# The tab icon lives inside index.html as text, so the one-file build keeps it too.
tab = re.sub(r'<!--.*?-->', '', SRC, flags=re.S)
tab = re.sub(r'>\s+<', '><', tab).strip().replace('"', "'")
href = 'data:image/svg+xml,' + quote(tab, safe=" '/:=,.-()")
html = (ROOT / 'index.html').read_text(encoding='utf-8')
new, n = re.subn(r'(<link rel="icon" type="image/svg\+xml" href=")[^"]*(">)', lambda m: m.group(1) + href + m.group(2), html)
assert n == 1, 'could not find the tab icon <link> in index.html'
(ROOT / 'index.html').write_text(new, encoding='utf-8')
print('updated the tab icon in index.html')
