import numpy as np
import pygame
VOLUME = 0.6
_sounds = {}

def _tone(freq, ms, vol=0.35, sr=44100):
    """One sine beep with a fade-out (no click)."""
    t    = np.linspace(0, ms / 1000, int(sr * ms / 1000), False)
    wave = np.sin(2 * np.pi * freq * t)
    fade = np.linspace(1, 0, len(wave)) ** 2
    mono = (wave * fade * vol * 32767).astype(np.int16)
    return np.column_stack([mono, mono])          # stereo

def _melody(notes):
    """notes = [(freq, ms), ...] joined into one sound."""
    return np.concatenate([_tone(f, ms) for f, ms in notes])

def init():
    """Call once at startup, AFTER pygame.mixer.init()."""
    if not pygame.mixer.get_init():
        return                                     # no audio — sounds disabled
    _sounds["task_done"]        = pygame.sndarray.make_sound(_melody([(660, 90), (880, 140)]))
    _sounds["session_complete"] = pygame.sndarray.make_sound(_melody([(523, 110), (659, 110), (784, 110), (1047, 220)]))
    _sounds["break_over"]       = pygame.sndarray.make_sound(_melody([(784, 120), (523, 180)]))
    _sounds["alert"]            = pygame.sndarray.make_sound(_melody([(330, 200)]))

def play(name):
    s = _sounds.get(name)
    if s and pygame.mixer.get_init():
        s.set_volume(VOLUME)
        s.play()