import firebase_admin
from firebase_admin import credentials, firestore as fb_firestore
from config import FIREBASE_KEY_PATH

db = None

def init():
    global db
    cred = credentials.Certificate(FIREBASE_KEY_PATH)
    firebase_admin.initialize_app(cred)
    db = fb_firestore.client()