from core.focus import FocusMonitor

def test_present_keeps_focused():
    f = FocusMonitor(); f.update(True)
    assert f.is_focused() is True

def test_away_after_limit(monkeypatch):
    f = FocusMonitor()
    clock = [1000.0]
    monkeypatch.setattr("core.focus.time.time", lambda: clock[0])
    f.update(False)
    assert f.is_focused() is True
    clock[0] += f.AWAY_LIMIT + 0.1
    f.update(False)
    assert f.is_focused() is False