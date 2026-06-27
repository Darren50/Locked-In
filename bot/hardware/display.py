import time
import mmap
import numpy as np
from PIL import Image
from config import FB_DEVICE, W, H

_fb_file = None
_fb_mmap = None

def init():
    global _fb_file, _fb_mmap
    _fb_file = open(FB_DEVICE, 'r+b')
    _fb_mmap = mmap.mmap(_fb_file.fileno(), 240 * 320 * 2)

def write_lcd(img):
    rotated = img.rotate(-90, expand=True)
    arr = np.frombuffer(rotated.tobytes(), dtype=np.uint8) \
            .reshape(320, 240, 3).astype(np.uint16)
    rgb565 = ((arr[:,:,0] & 0xF8) << 8) | \
             ((arr[:,:,1] & 0xFC) << 3) | \
              (arr[:,:,2] >> 3)
    _fb_mmap.seek(0)
    _fb_mmap.write(rgb565.tobytes())

def fade(from_img, duration=0.25):
    black = Image.new("RGB", (W, H), (0, 0, 0))
    start = time.time()
    while True:
        alpha = (time.time() - start) / duration
        if alpha >= 1.0:
            break
        write_lcd(Image.blend(from_img, black, min(alpha, 1.0)))