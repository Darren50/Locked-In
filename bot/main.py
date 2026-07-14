from services import db, assistant
from hardware import buttons, display, camera
from core import timer as timer_core
from screens.idle import run_idle
from screens.pomodoro import run_pomodoro, run_confirm_end
from screens.tasks import run_tasks
from screens.assistant import run_gemini

def main():
    print("Locked-In starting...")
    db.init()             # Firebase first (session tracker needs it)
    display.init()        # framebuffer
    buttons.init()        # GPIO + polling thread
    assistant.init()      # Groq client + pygame mixer
    timer_core.start_thread()
    camera.init()         # camera + face detection thread
    print("Locked-In started!")

    state, last_img = "idle", None
    while True:
        if   state == "idle":        state, last_img = run_idle(last_img)
        elif state == "pomodoro":    state, last_img = run_pomodoro(last_img)
        elif state == "confirm_end": state, last_img = run_confirm_end(last_img)
        elif state == "tasks":       state, last_img = run_tasks(last_img)
        elif state == "gemini":      state, last_img = run_gemini(last_img)

if __name__ == "__main__":
    main()