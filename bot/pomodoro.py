import numpy as np
from PIL import Image, ImageDraw

FB_DEVICE = "/dev/fb1"
W, H = 320, 240

def write_lcd(img):
    rotated = img.rotate(-90, expand=True)
    arr = np.frombuffer(rotated.tobytes(), dtype=np.uint8) \
            .reshape(320, 240, 3).astype(np.uint16)
    rgb565 = ((arr[:,:,0] & 0xF8) << 8) | \
             ((arr[:,:,1] & 0xFC) << 3) | \
              (arr[:,:,2] >> 3)
    with open(FB_DEVICE, "wb") as f:
        f.write(rgb565.tobytes())

img  = Image.new("RGB", (W, H), "navy")
draw = ImageDraw.Draw(img)
draw.rectangle([60, 80, 260, 160], fill="white")
draw.text((90, 108), "Locked-In", fill="black")
write_lcd(img)
print("Done")