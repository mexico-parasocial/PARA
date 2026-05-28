from PIL import Image
import numpy as np

# =========================
# CONFIG
# =========================
INPUT = "logo.png"

OUT_MONO = "icon-android-monochrome.png"
OUT_FOREGROUND = "icon-android-foreground.png"
OUT_NOTIFICATION = "icon-android-notification.png"

SIZE_LARGE = 1024
SIZE_SMALL = 96

# =========================
# LOAD IMAGE
# =========================
img = Image.open(INPUT).convert("RGBA")

def prepare_canvas(image, size):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    image = image.copy()
    image.thumbnail((int(size * 0.8), int(size * 0.8)))

    x = (size - image.width) // 2
    y = (size - image.height) // 2

    canvas.paste(image, (x, y), image)
    return canvas

img_large = prepare_canvas(img, SIZE_LARGE)
img_small = prepare_canvas(img, SIZE_SMALL)

def to_numpy(image):
    arr = np.array(image)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    return rgb, alpha

# 🔥 USAR ALPHA COMO MÁSCARA (clave)
def get_mask(alpha):
    return alpha > 10

# =========================
# MONOCHROME (BLANCO PURO)
# =========================
def make_white(alpha):
    mask = get_mask(alpha)

    new_rgb = np.zeros((alpha.shape[0], alpha.shape[1], 3), dtype=np.uint8)
    new_rgb[mask] = [255, 255, 255]

    return np.dstack((new_rgb, alpha))

# =========================
# FOREGROUND (GRADIENTE)
# =========================
def make_gradient(alpha):
    h, w = alpha.shape
    mask = get_mask(alpha)

    top_color = np.array([72, 38, 127])    # #48267F (primary_600)
    bottom_color = np.array([71, 70, 82]) # #474652 (primary_500)

    new_rgb = np.zeros((h, w, 3), dtype=np.uint8)

    for y in range(h):
        t = y / (h - 1)
        color = (1 - t) * top_color + t * bottom_color

        new_rgb[y, mask[y]] = color

    return np.dstack((new_rgb.astype(np.uint8), alpha))

# =========================
# GENERATE
# =========================
_, alpha_large = to_numpy(img_large)
_, alpha_small = to_numpy(img_small)

mono = make_white(alpha_large)
foreground = make_gradient(alpha_large)
notif = make_white(alpha_small)

Image.fromarray(mono).save(OUT_MONO)
Image.fromarray(foreground).save(OUT_FOREGROUND)
Image.fromarray(notif).save(OUT_NOTIFICATION)

print("✅ Fixed & generated:")
print(" -", OUT_MONO)
print(" -", OUT_FOREGROUND)
print(" -", OUT_NOTIFICATION)