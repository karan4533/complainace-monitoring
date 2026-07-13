from PIL import Image
import os

src = r'src/assets/heuristic-labs-logo.png'
img = Image.open(src).convert('RGBA')
pixels = img.load()
w, h = img.size

light_on_dark = Image.new('RGBA', (w, h), (0, 0, 0, 0))
dark_on_light = Image.new('RGBA', (w, h), (0, 0, 0, 0))
lp = light_on_dark.load()
dp = dark_on_light.load()

count = 0
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a < 12:
            continue
        # Source mark is near-black (#141414) — keep alpha, recolor for UI
        lp[x, y] = (255, 255, 255, a)
        dp[x, y] = (45, 36, 27, a)  # brand dark for light backgrounds
        count += 1

out_dir = r'src/assets'
light_path = os.path.join(out_dir, 'heuristic-labs-logo-light.png')
dark_path = os.path.join(out_dir, 'heuristic-labs-logo-dark.png')
light_on_dark.save(light_path)
dark_on_light.save(dark_path)
print(f'recolored {count} pixels')
print('saved', light_path)
print('saved', dark_path)
