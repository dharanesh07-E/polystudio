"""Play MIDI files (requires pygame)."""
import os
import time

try:
    import pygame  # type: ignore[import-not-found,import-untyped]
    HAS_PYGAME = True
except ImportError:
    HAS_PYGAME = False
    pygame = None  # type: ignore


def play_midi(path="output.mid"):
    if not HAS_PYGAME or pygame is None:
        print("[!] Install pygame: pip install pygame")
        print(f"   File: {os.path.abspath(path)}")
        return False
    if not os.path.exists(path):
        print(f"[-] Not found: {path}")
        return False

    assert pygame is not None
    pygame.mixer.init()
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    print(f"[>] Playing {path}...")
    while pygame.mixer.music.get_busy():
        time.sleep(0.1)
    pygame.mixer.quit()
    print("[*] Done.")
    return True