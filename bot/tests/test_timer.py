from core.timer import PomodoroTimer

def test_initial_state():
    t = PomodoroTimer()
    s = t.state()
    assert s["mode"] == "FOCUS" and s["paused"] is True and s["session"] == 1

def test_start():
    t = PomodoroTimer(); t.start()
    assert t.state()["active"] and not t.state()["paused"]

def test_skip_to_break():
    t = PomodoroTimer(); t.start(); t.skip()
    assert t.state()["mode"] == "BREAK"

def test_long_break_on_4th():
    t = PomodoroTimer(); t.start()
    for _ in range(7):
        t.skip()
    assert t.state()["mode"] == "LONG BREAK"

def test_tick_counts_down():
    t = PomodoroTimer(); t.start()
    before = t.state()["time_left"]; t.tick()
    assert t.state()["time_left"] == before - 1

def test_full_stop_resets():
    t = PomodoroTimer(); t.start(); t.skip(); t.full_stop()
    s = t.state()
    assert s["session"] == 1 and s["mode"] == "FOCUS" and not s["active"]