from PIL import Image
import numpy as np

# =========================
# CONFIG
# =========================
INPUT = "splash.png"

OUT_DARK = "splash-dark.png"
OUT_LIGHT = "splash-light.png"

# =========================
# HELPERS
# =========================
def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return np.array([int(hex_color[i:i+2], 16) for i in (0, 2, 4)])

def adjust_color(color, factor):
    return np.clip(color * factor, 0, 255)

# =========================
# BASE COLOR (TU BRAND)
# =========================
BASE = hex_to_rgb("#474652")  # primary_500

# =========================
# PALETTES
# =========================

# 🌙 DARK (igual que antes, fuerte identidad)
DARK_TOP = hex_to_rgb("#2E2033")
DARK_BOTTOM = hex_to_rgb("#0f0a14")

# ☀️ LIGHT (DERIVADO REAL DE #474652 🔥)
LIGHT_TOP = adjust_color(BASE, 1.01)    # más claro
LIGHT_BOTTOM = adjust_color(BASE, 0.85) # ligeramente más oscuro

# =========================
# LOAD IMAGE
# =========================
img = Image.open(INPUT).convert("RGBA")
arr = np.array(img)

rgb = arr[:, :, :3]
alpha = arr[:, :, 3]

height, width, _ = rgb.shape

# Detectar estrellas
stars_mask = (rgb[:, :, 0] > 240) & (rgb[:, :, 1] > 240) & (rgb[:, :, 2] > 240)

# =========================
# GRADIENT FUNCTION
# =========================
def apply_gradient(top_color, bottom_color):
    result = np.zeros_like(rgb)

    for y in range(height):
        t = y / (height - 1)
        color = (1 - t) * top_color + t * bottom_color
        result[y, :, :] = color

    # Mantener estrellas
    result[stars_mask] = rgb[stars_mask]

    return result.astype(np.uint8)

# =========================
# GENERATE
# =========================
dark_rgb = apply_gradient(DARK_TOP, DARK_BOTTOM)
light_rgb = apply_gradient(LIGHT_TOP, LIGHT_BOTTOM)

dark_img = np.dstack((dark_rgb, alpha))
light_img = np.dstack((light_rgb, alpha))

# =========================
# SAVE
# =========================
Image.fromarray(dark_img).save(OUT_DARK)
Image.fromarray(light_img).save(OUT_LIGHT)

print("✅ Done:")
print(" -", OUT_DARK)
print(" -", OUT_LIGHT)