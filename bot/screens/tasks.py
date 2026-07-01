import threading
from PIL import Image, ImageDraw
from config import W, H, USER_UID
from fonts import FONT_MED, FONT_SMALL, FONT_TINY
from hardware.display import write_lcd, fade
from hardware.buttons import k1, k2, k3, k4
from services import db as db_service

VISIBLE_ROWS = 5

def draw_tasks(tasks, selected_idx, scroll_offset, loading=False):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((12, 8), "TASKS", fill=(160, 160, 220), font=FONT_MED)

    if loading:
        draw.text((100, 110), "Loading...", fill=(120, 120, 140), font=FONT_MED)
        draw.text((18, 222), "K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
        return img

    if not tasks:
        draw.text((72, 110), "No tasks yet!", fill=(120, 120, 140), font=FONT_MED)
        draw.text((18, 222), "K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
        return img

    done_count = sum(1 for t in tasks if t.get("done"))
    count_str  = f"{done_count}/{len(tasks)} done"
    draw.text((W - 10 - len(count_str)*6, 12), count_str, fill=(100, 100, 130), font=FONT_TINY)
    draw.line([10, 34, W-10, 34], fill=(40, 40, 60), width=1)

    visible = tasks[scroll_offset : scroll_offset + VISIBLE_ROWS]
    for i, task in enumerate(visible):
        abs_idx = scroll_offset + i
        row_y   = 40 + i * 32
        if abs_idx == selected_idx:
            draw.rounded_rectangle([8, row_y-2, W-8, row_y+26], radius=5, fill=(40, 40, 70))
        if task.get("done"):
            cb_col, cb_label, txt_col = (80, 200, 120), "[x]", (120, 120, 140)
        else:
            cb_col, cb_label, txt_col = (140, 140, 160), "[ ]", (210, 210, 225)
        draw.text((14, row_y+2), cb_label, fill=cb_col, font=FONT_SMALL)
        text = task.get("text", "")
        if len(text) > 36:
            text = text[:35] + "…"
        draw.text((52, row_y+2), text, fill=txt_col, font=FONT_SMALL)

    if scroll_offset > 0:
        draw.text((W-16, 38), "▲", fill=(100, 100, 140), font=FONT_TINY)
    if scroll_offset + VISIBLE_ROWS < len(tasks):
        draw.text((W-16, 196), "▼", fill=(100, 100, 140), font=FONT_TINY)

    draw.text((12, 222), "K1 Details  K2↑  K3↓  K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
    return img

def draw_task_detail(tasks, idx):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((12, 8), "TASK DETAIL", fill=(160, 160, 220), font=FONT_MED)
    count_str = f"{idx+1}/{len(tasks)}"
    draw.text((W - 10 - len(count_str)*6, 12), count_str, fill=(100, 100, 130), font=FONT_TINY)
    draw.line([10, 34, W-10, 34], fill=(40, 40, 60), width=1)

    task = tasks[idx]
    if task.get("done"):
        cb_col, cb_label, txt_col = (80, 200, 120), "[x]", (120, 120, 140)
    else:
        cb_col, cb_label, txt_col = (140, 140, 160), "[ ]", (210, 210, 225)

    draw.text((14, 42), cb_label, fill=cb_col, font=FONT_SMALL)
    title = task.get("text", "")
    if len(title) > 36:
        draw.text((52, 42), title[:36], fill=txt_col, font=FONT_SMALL)
        draw.text((52, 57), title[36:72] + "…", fill=txt_col, font=FONT_SMALL)
        y = 78
    else:
        draw.text((52, 42), title, fill=txt_col, font=FONT_SMALL)
        y = 64

    desc = task.get("description", "")
    if desc:
        draw.text((14, y), "Desc:", fill=(140, 140, 170), font=FONT_TINY)
        y += 13
        if len(desc) > 42:
            draw.text((14, y), desc[:42], fill=(190, 190, 210), font=FONT_TINY)
            y += 13
            draw.text((14, y), desc[42:84] + "…", fill=(190, 190, 210), font=FONT_TINY)
            y += 16
        else:
            draw.text((14, y), desc, fill=(190, 190, 210), font=FONT_TINY)
            y += 16

    due_date = task.get("dueDate", "")
    due_time = task.get("dueTime", "")
    if due_date or due_time:
        due_str = "Due: " + due_date
        if due_time:
            due_str += f"  {due_time}"
        draw.text((14, y + 4), due_str, fill=(220, 180, 80), font=FONT_SMALL)

    draw.text((12, 222), "K1 Toggle  K2 Prev  K3 Next  K4 Back", fill=(60, 60, 80), font=FONT_SMALL)
    return img

def run_tasks(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)
    write_lcd(draw_tasks([], 0, 0, loading=True))

    tasks      = []
    tasks_lock = threading.Lock()
    first_snap = threading.Event()

    def _on_tasks(docs, changes, read_time):
        new_tasks = sorted([{"id": d.id, **d.to_dict()} for d in docs], key=lambda t: t.get("order", 0))
        with tasks_lock:
            tasks[:] = new_tasks
        first_snap.set()

    watch = db_service.db.collection("users").document(USER_UID) \
               .collection("tasks").on_snapshot(_on_tasks)
    first_snap.wait(timeout=5)

    selected_idx  = 0
    scroll_offset = 0
    view          = "list"

    while True:
        with tasks_lock:
            snapshot = list(tasks)
        if snapshot:
            selected_idx = min(selected_idx, len(snapshot) - 1)

        img = draw_tasks(snapshot, selected_idx, scroll_offset) if view == "list" else draw_task_detail(snapshot, selected_idx)
        write_lcd(img)

        if view == "list":
            if k4.is_set():
                k4.clear(); watch.unsubscribe(); return "idle", img
            if k1.is_set() and snapshot:
                k1.clear(); view = "detail"
            if k2.is_set() and snapshot:
                k2.clear()
                selected_idx = max(selected_idx - 1, 0)
                if selected_idx < scroll_offset:
                    scroll_offset -= 1
            if k3.is_set() and snapshot:
                k3.clear()
                selected_idx = min(selected_idx + 1, len(snapshot) - 1)
                if selected_idx >= scroll_offset + VISIBLE_ROWS:
                    scroll_offset += 1
        else:
            if k4.is_set():
                k4.clear(); view = "list"
            if k1.is_set() and snapshot:
                k1.clear()
                t        = snapshot[selected_idx]
                new_done = not t.get("done", False)
                with tasks_lock:
                    tasks[selected_idx]["done"] = new_done
                db_service.db.collection("users").document(USER_UID) \
                  .collection("tasks").document(t["id"]).update({"done": new_done})
            if k2.is_set() and snapshot:
                k2.clear()
                selected_idx = max(selected_idx - 1, 0)
                if selected_idx < scroll_offset:
                    scroll_offset -= 1
            if k3.is_set() and snapshot:
                k3.clear()
                selected_idx = min(selected_idx + 1, len(snapshot) - 1)
                if selected_idx >= scroll_offset + VISIBLE_ROWS:
                    scroll_offset += 1