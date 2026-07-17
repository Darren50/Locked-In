import os
import pygame
from dotenv import load_dotenv
from groq import Groq
from config import ENV_PATH

groq_client = None

def init():
    global groq_client
    load_dotenv(ENV_PATH)
    groq_client = Groq(api_key=os.environ["GROQ_API_KEY"])
    try:
        pygame.mixer.init()
    except pygame.error as e:
        print(f"Audio unavailable ({e}) — voice output disabled")

def transcribe(wav_path):
    with open(wav_path, "rb") as f:
        transcription = groq_client.audio.transcriptions.create(
            file=(os.path.basename(wav_path), f.read()),
            model="whisper-large-v3",
            language="en",
            temperature=0.0,
            prompt="This is a student asking a study or general knowledge question.",
        )
    return transcription.text.strip()

def answer(question, context):
    completion = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": context},
            {"role": "user",   "content": question},
        ],
    )
    return completion.choices[0].message.content