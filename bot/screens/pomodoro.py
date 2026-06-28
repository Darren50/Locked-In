from PIL import Image, ImageDraw
from config import W, H, SESSIONS_BEFORE_LONG
from fonts import FONT_BIG, FONT_MED, FONT_SMALL, FONT_TINY
from hardware.display import write_lcd, fade
from hardware.buttons import k1, k2, k3, k4
from core.timer import timer
from core.focus import focus
from core.session import session_tracker

def draw_pomodoro(ts):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)

    accent   = (220, 80, 80)  if ts['mode'] == "FOCUS" else (80, 200, 120)
    bg_badge = (60, 15, 15)   if ts['mode'] == "FOCUS" else (15, 55, 25)

    draw.text((12, 10), "LOCKED IN", fill=(160, 160, 220), font=FONT_MED)
    draw.rounded_rectangle([200, 7, 308, 30], radius=7,
                            fill=bg_badge, outline=accent, width=1)
    draw.text((208, 11),
              "BREAK" if "BREAK" in ts['mode'] else ts['mode'],
              fill=accent, font=FONT_SMALL)

    mins, secs = divmod(ts['time_left'], 60)

    if not ts['active']:
        timer_col = (85, 85, 105)
        draw.text((72, 57), "PRESS K1 TO START", fill=(175, 170, 95), font=FONT_TINY)
    elif ts['paused']:
        timer_col = (140, 140, 140)
        draw.text((120, 57), "PAUSED", fill=(220, 200, 80), font=FONT_SMALL)
    else:
        timer_col = "white"

    draw.text((45, 75), f"{mins:02d}:{secs:02d}", fill=timer_col, font=FONT_BIG)

    # ── State-specific warning banner ──
    if not focus.is_focused() and ts['active'] and ts['mode'] == "FOCUS":
        state = focus.get_state()
        if state == "DROWSY":
            banner_col, msg = (180, 130, 0),  "⚠ Wake up! Timer paused."
        elif state == "DISTRACTED":
            banner_col, msg = (190, 90, 0),   "⚠ Eyes on your work!"
        else:  # AWAY
            banner_col, msg = (180, 40, 40),  "⚠ Come back! Timer paused."
        draw.rounded_rectangle([10, 50, 310, 72], radius=6, fill=banner_col)
        draw.text((22, 55), msg, fill="white", font=FONT_SMALL)

    bar_w = int(300 * (ts['total'] - ts['time_left']) / max(ts['total'], 1))
    draw.rectangle([10, 185, 310, 191], fill=(40, 40, 60))
    draw.rectangle([10, 185, 10+bar_w, 191], fill=accent)

    draw.text((12, 200), f"Session {ts['session']} of {SESSIONS_BEFORE_LONG}",
              fill=(120, 120, 140), font=FONT_SMALL)

    if not ts['active']:
        draw.text((12, 222), "K1 Start                        K4 Home",
                  fill=(60, 60, 80), font=FONT_SMALL)
    else:
        draw.text((12, 222), "K1 Pause  K2 Skip  K3 End  K4 Home",
                  fill=(60, 60, 80), font=FONT_SMALL)
    return img

def run_pomodoro(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)
    while True:
        ts  = timer.state()
        img = draw_pomodoro(ts)
        write_lcd(img)

        if k4.is_set():
            k4.clear(); return "idle", img

        if k3.is_set() and ts['active']:
            k3.clear(); return "confirm_end", img

        if k2.is_set() and ts['active']:
            k2.clear()
            if ts['mode'] == "FOCUS":
                session_tracker.end(completed=False)
            timer.skip()
            if timer.state()['mode'] == "FOCUS":
                session_tracker.start(timer.state()['session'])

        if k1.is_set():
            k1.clear()
            if not ts['active']:
                timer.start()
                session_tracker.start(ts['session'])
            else:
                timer.toggle_pause()

def run_confirm_end(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)

    img  = Image.new("RGB", (W, H), (15, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((78, 42),  "End Session?", fill="white", font=FONT_MED)
    draw.text((42, 82),  "Timer will reset to session 1.", fill=(160, 150, 180), font=FONT_SMALL)
    draw.rounded_rectangle([28,  118, 142, 165], radius=10, fill=(155, 30, 30))
    draw.text((57,  130), "YES", fill="white", font=FONT_MED)
    draw.rounded_rectangle([178, 118, 292, 165], radius=10, fill=(30, 125, 65))
    draw.text((207, 130), "NO",  fill="white", font=FONT_MED)
    draw.text((22, 218), "K1 Yes, end it    K2 No, go back", fill=(100, 90, 120), font=FONT_SMALL)
    write_lcd(img)

    while True:
        if k1.is_set():
            k1.clear()
            session_tracker.end(completed=False)
            timer.full_stop()
            return "idle", img
        if k2.is_set() or k4.is_set():
            k2.clear(); k4.clear(); return "pomodoro", img