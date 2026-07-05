"""Generate CrewLink brand assets from assets/images/logo_original.png.

Transparent, vertically-stacked logo (compass mark over the "CrewLink" wordmark),
original navy/green colors, with the crew silhouette inside the compass recolored
to the brand green.
"""
import numpy as np
from PIL import Image, ImageFilter

SRC = "assets/images/logo_original.png"
BG = np.array([243, 243, 240], np.float32)

orig = np.array(Image.open(SRC).convert("RGB")).astype(np.float32)
H, W = orig.shape[:2]
r, g, b = orig[..., 0], orig[..., 1], orig[..., 2]
dist = np.sqrt(((orig - BG) ** 2).sum(2))
alpha = np.clip((dist - 18) / (45 - 18), 0, 1)
green = (g > r * 1.12) & (g > b * 1.05) & (g > 90)
fg = alpha > 0.5
ink = fg & (~green)  # navy ink: compass ring + crew

# lockup bbox + gap between compass and wordmark
ys, xs = np.where(alpha > 0.3)
lx0, ly0, lx1, ly1 = int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1
col = (alpha[ly0:ly1, lx0:lx1] > 0.3).sum(0)
i = 0
Wl = lx1 - lx0
while i < Wl and col[i] == 0:
    i += 1
while i < Wl and col[i] > 0:
    i += 1
gap = lx0 + i  # compass occupies x in [lx0, gap]

# --- crew detection: middle dark runs inside the compass (ring on both sides) ---
mh = ly1 - ly0
cw = gap - lx0
max_run = cw * 0.55  # people runs are narrow; the bottom band is wide -> excluded
crew = np.zeros((H, W), bool)
for y in range(ly0 + int(mh * 0.44), ly0 + int(mh * 0.75)):  # above the bottom band
    row = ink[y, lx0:gap]
    idx = np.where(row)[0]
    if idx.size < 3:
        continue
    runs = []
    s = prev = idx[0]
    for x in idx[1:]:
        if x == prev + 1:
            prev = x
        else:
            runs.append((s, prev))
            s = prev = x
    runs.append((s, prev))
    if len(runs) < 3:
        continue  # need left ring | crew | right ring
    for (a, bb) in runs[1:-1]:  # middle runs = crew
        if (bb - a + 1) <= max_run:
            crew[y, lx0 + a:lx0 + bb + 1] = True

# grow slightly to catch anti-aliased edges
crew = np.array(Image.fromarray((crew * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 128
crew &= ink  # stay within the ink

# brand green sampled from the logo's own green
green_color = np.median(orig[green], axis=0) if green.any() else np.array([47, 167, 70], np.float32)
print("green", green_color.round(1), "crew px", int(crew.sum()))

# background -> transparent (crew kept navy; set RECOLOR_CREW to re-enable green)
RECOLOR_CREW = False
rgb = orig.copy()
if RECOLOR_CREW:
    rgb[crew] = green_color
out = np.zeros((H, W, 4), np.uint8)
out[..., :3] = rgb.astype(np.uint8)
out[..., 3] = (alpha * 255).astype(np.uint8)
full = Image.fromarray(out, "RGBA")


def trim(img):
    al = np.array(img)[..., 3]
    ys, xs = np.where(al > 20)
    return img.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


mark = trim(full.crop((lx0, ly0, gap, ly1)))
text = trim(full.crop((gap, ly0, lx1, ly1)))
mw, mh2 = mark.size
tw, th = text.size
gap_v = int(mh2 * 0.16)
pad = int(max(mw, tw) * 0.06)
cw2 = max(mw, tw) + 2 * pad
ch = mh2 + gap_v + th + 2 * pad
canvas = Image.new("RGBA", (cw2, ch), (0, 0, 0, 0))
canvas.paste(mark, ((cw2 - mw) // 2, pad), mark)
canvas.paste(text, ((cw2 - tw) // 2, pad + mh2 + gap_v), text)
def add_outline(img, thickness, color=(255, 255, 255, 255)):
    m = thickness + 8
    big = Image.new("RGBA", (img.width + 2 * m, img.height + 2 * m), (0, 0, 0, 0))
    big.paste(img, (m, m), img)
    dil = big.split()[3]
    for _ in range(max(1, round(thickness / 2))):
        dil = dil.filter(ImageFilter.MaxFilter(5))  # grow the silhouette
    dil = dil.filter(ImageFilter.GaussianBlur(1.4))  # soften the edge
    base = Image.new("RGBA", big.size, color)
    base.putalpha(dil)
    return Image.alpha_composite(base, big)


# native splash sits on a light background -> plain navy/green logo
canvas.save("assets/images/splash-icon.png")
# in-app logo sits on dark screens -> add a white outline around the whole mark
thick = max(3, round(min(cw2, ch) * 0.009))
outlined = add_outline(canvas, thick)
outlined.save("assets/images/logo.png")
print("logo.png", outlined.size, "aspect", round(outlined.size[0] / outlined.size[1], 4))


def square(img, size, bg, scale):
    c = Image.new("RGBA", (size, size), bg)
    iw, ih = img.size
    s = (size * scale) / max(iw, ih)
    rs = img.resize((max(1, int(iw * s)), max(1, int(ih * s))), Image.LANCZOS)
    c.paste(rs, ((size - rs.size[0]) // 2, (size - rs.size[1]) // 2), rs)
    return c


LIGHT = (243, 243, 240, 255)
square(mark, 1024, LIGHT, 0.72).convert("RGB").save("assets/images/icon.png")
square(mark, 1024, (0, 0, 0, 0), 0.56).save("assets/images/android-icon-foreground.png")
square(mark, 256, LIGHT, 0.78).convert("RGB").save("assets/images/favicon.png")
print("done")
