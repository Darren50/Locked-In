import time
from hardware.display import write_lcd, fade
from hardware.buttons import k1, k2, k3, k4
from core.timer import timer
from screens.faces import draw_cute, draw_serious

def run_idle(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)
    start = time.time()
    while True:
        t        = time.time() - start
        ts       = timer.state()
        on_focus = ts['active'] and ts['mode'] == "FOCUS"
        img = draw_serious(t, ts) if on_focus else draw_cute(t, ts)
        write_lcd(img)

        if k1.is_set():
            k1.clear(); return "pomodoro", img
        if k2.is_set():
            k2.clear(); return "tasks", img
        if k3.is_set():
            k3.clear(); return "gemini", img
        k4.clear()