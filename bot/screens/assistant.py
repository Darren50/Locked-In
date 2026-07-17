import time
import os
import tempfile
import numpy as np
import sounddevice as sd
from scipy.io.wavfile import write as wav_write
from gtts import gTTS
import pygame
from PIL import Image, ImageDraw
from config import W, H, SAMPLE_RATE, SESSIONS_BEFORE_LONG
from fonts import FONT_MED, FONT_SMALL, FONT_TINY
from hardware.display import write_lcd, fade
from hardware.buttons import k1, k2, k3, k4
from core.timer import timer
from services.assistant import transcribe, answer

def draw_gemini(status, response=""):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((12, 8), "AI ASSISTANT", fill=(160, 160, 220), font=FONT_MED)
    draw.line([10, 34, W-10, 34], fill=(40, 40, 60), width=1)

    if status == "idle":
        draw.text((60, 95),  "Press K1 to ask", fill=(180, 180, 200), font=FONT_MED)
        draw.text((75, 125), "a question",       fill=(180, 180, 200), font=FONT_MED)
        draw.text((12, 222), "K1 Ask  K4 Home",  fill=(60, 60, 80),   font=FONT_SMALL)
    elif status == "recording":
        draw.ellipse([148, 80, 172, 104], fill=(210, 50, 50))
        draw.text((105, 115), "Recording...",     fill=(210, 50, 50),   font=FONT_MED)
        draw.text((55,  140), "Press K1 to stop", fill=(160, 160, 180), font=FONT_SMALL)
        draw.text((12,  222), "K1 Stop  K4 Home", fill=(60, 60, 80),   font=FONT_SMALL)
    elif status == "thinking":
        draw.text((90, 105), "Thinking...", fill=(220, 180, 80), font=FONT_MED)
        draw.text((12, 222), "K4 Home",     fill=(60, 60, 80),  font=FONT_SMALL)
    elif status == "speaking":
        draw.text((85, 45), "Speaking...", fill=(80, 200, 120), font=FONT_MED)
        if response:
            words = response.split()
            line, lines = "", []
            for word in words:
                test = (line + " " + word).strip()
                if len(test) > 38:
                    lines.append(line); line = word
                else:
                    line = test
            if line:
                lines.append(line)
            for i, l in enumerate(lines[:6]):
                draw.text((12, 72 + i*22), l, fill=(160, 160, 180), font=FONT_TINY)
        draw.text((12, 222), "K1 Skip  K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
    elif status == "error":
        draw.text((85, 100), "Error :(",         fill=(210, 50, 50),   font=FONT_MED)
        draw.text((40, 130), "Check connection", fill=(160, 160, 180), font=FONT_SMALL)
        draw.text((12, 222), "K1 Try again  K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
    return img

def run_gemini(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)

    recording_data = []
    status         = "idle"
    response_text  = ""
    stream         = None

    def audio_callback(indata, frames, time_info, status_flags):
        recording_data.append(indata.copy())

    while True:
        write_lcd(draw_gemini(status, response=response_text))

        if k4.is_set():
            k4.clear()
            if stream and stream.active:
                stream.stop(); stream.close()
            if pygame.mixer.get_init() and pygame.mixer.music.get_busy():
                pygame.mixer.music.stop()
            return "idle", draw_gemini(status)

        if k1.is_set():
            k1.clear()
            if status in ("idle", "error"):
                recording_data.clear()
                stream = sd.InputStream(samplerate=SAMPLE_RATE, channels=1, callback=audio_callback)
                stream.start()
                status = "recording"

            elif status == "recording":
                stream.stop(); stream.close(); stream = None
                audio = np.concatenate(recording_data, axis=0) if recording_data else np.array([])
                if len(audio) < int(SAMPLE_RATE * 0.7):
                    print("Recording too short, ignoring")
                    status = "idle"
                    continue

                status = "thinking"
                write_lcd(draw_gemini("thinking"))
                try:
                    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
                    wav_write(tmp.name, SAMPLE_RATE, audio)

                    question = transcribe(tmp.name)
                    os.unlink(tmp.name)
                    print(f"Heard: {question}")
                    if not question:
                        status = "idle"; continue

                    ts      = timer.state()
                    context = (
                        f"You are a helpful AI assistant inside a Pomodoro study bot "
                        f"called Locked-In. The user is on session {ts['session']} of "
                        f"{SESSIONS_BEFORE_LONG}, in {ts['mode']} mode. "
                        f"Answer their question clearly and concisely in 2-3 sentences."
                    )
                    response_text = answer(question, context)

                    status = "speaking"
                    write_lcd(draw_gemini("speaking", response=response_text))

                    if pygame.mixer.get_init():
                        tts      = gTTS(text=response_text, lang="en")
                        tts_file = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
                        tts.save(tts_file.name)
                        pygame.mixer.music.load(tts_file.name)
                        pygame.mixer.music.play()
                        while pygame.mixer.music.get_busy():
                            time.sleep(0.1)
                            if k1.is_set():
                                k1.clear()
                                pygame.mixer.music.stop()
                                break
                        os.unlink(tts_file.name)
                    else:
                        time.sleep(4)
                    status = "idle"; response_text = ""

                except Exception as e:
                    print(f"Assistant error: {e}")
                    status = "error"; response_text = ""

            elif status == "speaking":
                if pygame.mixer.get_init():
                    pygame.mixer.music.stop()
                status = "idle"; response_text = ""

        time.sleep(0.05)