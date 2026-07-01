import time
import threading
import lgpio
from config import PIN_K1, PIN_K2, PIN_K3, PIN_K4

k1 = threading.Event()
k2 = threading.Event()
k3 = threading.Event()
k4 = threading.Event()

chip = None

def _poll():
    prev = {PIN_K1: 1, PIN_K2: 1, PIN_K3: 1, PIN_K4: 1}
    pmap = {PIN_K1: k1, PIN_K2: k2, PIN_K3: k3, PIN_K4: k4}
    while True:
        for pin in [PIN_K1, PIN_K2, PIN_K3, PIN_K4]:
            val = lgpio.gpio_read(chip, pin)
            if val == 0 and prev[pin] == 1:
                pmap[pin].set()
            prev[pin] = val
        time.sleep(0.05)

def init():
    global chip
    chip = lgpio.gpiochip_open(0)
    for pin in [PIN_K1, PIN_K2, PIN_K3, PIN_K4]:
        lgpio.gpio_claim_input(chip, pin, lgpio.SET_PULL_UP)
    threading.Thread(target=_poll, daemon=True).start()