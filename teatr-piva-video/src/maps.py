"""Карты для 3D-версии: высота (со скруглёнными кромками резьбы), нормали, цвет камня; то же для стены.
Запуск: python3 src/maps.py   (нужен build/height_raw.png из `HEIGHT=1 node src/relief.js`)
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

B = os.path.join(os.path.dirname(__file__), '..', 'build')
rng = np.random.default_rng(12)
G = ndi.gaussian_filter


def fbm(shape, scales, amps):
    """Многооктавный шум в диапазоне примерно -1..1."""
    out = np.zeros(shape, np.float32)
    for s, a in zip(scales, amps):
        n = G(rng.standard_normal(shape).astype(np.float32), s)
        out += a * n / (n.std() + 1e-9)
    return out / (3 * sum(amps))


def normal_map(z_px, grain=0.0):
    """z_px — высота в пикселях. Касательное пространство, ось Y вверх (OpenGL)."""
    if grain:
        z_px = z_px + grain * G(rng.standard_normal(z_px.shape).astype(np.float32), 0.8)
    gy, gx = np.gradient(z_px)
    n = np.dstack([-gx, gy, np.ones_like(z_px)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)


def stone_albedo(shape, z, base, ao_strength=0.5):
    low = fbm(shape, [90, 35, 12], [1, 0.6, 0.35])
    mid = fbm(shape, [5, 2], [1, 0.7])
    stain = np.clip(fbm(shape, [140, 60], [1, 0.5]) * 2.2, -1, 1)
    cav = np.clip((G(z, 22) - z) * 5.0, -0.6, 1.0)   # >0 в углублениях
    lum = 1.0 + 0.30 * low + 0.10 * mid - ao_strength * np.clip(cav, 0, 1) + 0.10 * np.clip(-cav, 0, 1)
    speck = (rng.random(shape) > 0.9965).astype(np.float32)
    lum -= 0.22 * G(speck, 1.1) * 6
    rgb = np.dstack([base[0] * lum * (1 + 0.05 * stain), base[1] * lum, base[2] * lum * (1 - 0.10 * stain)])
    return (np.clip(rgb, 0, 1) * 255).astype(np.uint8)


# ---------------- рельеф ----------------
h0 = np.asarray(Image.open(os.path.join(B, 'height_raw.png')).convert('L')).astype(np.float32) / 255.0
BG = 78 / 255.0
hs = G(h0, 1.6)
# скругление кромок: у края каждой ступени высота плавно спадает (профиль четверти круга)
g1 = G(h0, 1.0)
gy, gx = np.gradient(g1)
edges = np.hypot(gx, gy) > 0.012
dist = ndi.distance_transform_edt(~edges).astype(np.float32)
R = 15.0
d = np.clip(dist / R, 0, 1)
fillet = np.sqrt(1 - (1 - d) ** 2)
hi = np.clip((h0 - G(h0, 9)) * 14, 0, 1)             # 1 на «верхней» стороне кромки
h = hs - 0.050 * (1 - fillet) * hi
# лёгкая выпуклость крупных форм
h += 0.035 * np.clip(dist / 60, 0, 1) ** 0.5 * (h0 > BG + 0.15)
h = G(h, 0.9)
# неровности и сколы камня
h += 0.012 * fbm(h.shape, [70, 25, 9], [1, 0.6, 0.4])
pits = (rng.random(h.shape) > 0.99975).astype(np.float32)
h -= 0.6 * G(pits, 2.2)
z = (h - BG)                                          # 1.0 = 100 px = 1 единица сцены
ZMIN, ZMAX = -0.25, 0.75
z = np.clip(z, ZMIN, ZMAX)
Image.fromarray(((z - ZMIN) / (ZMAX - ZMIN) * 255).astype(np.uint8)).save(os.path.join(B, 'r_height.png'))
Image.fromarray(normal_map(z * 100, grain=0.9)).save(os.path.join(B, 'r_normal.png'))
Image.fromarray(stone_albedo(h.shape, z, (0.80, 0.66, 0.46), 0.55)).save(os.path.join(B, 'r_albedo.jpg'), quality=93)
print('relief maps ok', z.min(), z.max())

# ---------------- стена из блоков ----------------
S = 2048
wh = np.ones((S, S), np.float32)
rowH = S // 8
for r in range(8):
    y = r * rowH
    wh[max(0, y - 5):y + 5, :] = 0
    off = 0 if r % 2 else S // 8
    for x in range(off, S, S // 4):
        wh[y:y + rowH, max(0, x - 5):x + 5] = 0
blocks = ndi.label(wh > 0)[0]
tone = rng.random(blocks.max() + 1).astype(np.float32)
wz = G(wh, 4) * 0.10 + (tone[blocks] - 0.5) * 0.03 * (wh > 0) + 0.05 * fbm((S, S), [60, 20, 7], [1, 0.6, 0.4])
Image.fromarray(normal_map(wz * 100, grain=1.2)).save(os.path.join(B, 'w_normal.png'))
alb = stone_albedo((S, S), wz, (0.50, 0.41, 0.30), 0.8).astype(np.float32)
alb *= (0.85 + 0.3 * tone[blocks])[..., None]
Image.fromarray(np.clip(alb, 0, 255).astype(np.uint8)).save(os.path.join(B, 'w_albedo.jpg'), quality=92)
print('wall maps ok')
