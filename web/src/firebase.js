import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDlLEKMXGsf1fsoB8gJTz7F_HZ5vVt9AVY",
  authDomain: "locked-in-d19f7.firebaseapp.com",
  projectId: "locked-in-d19f7",
  storageBucket: "locked-in-d19f7.firebasestorage.app",
  messagingSenderId: "703059764262",
  appId: "1:703059764262:web:9766cbfeb4147b99d172e7"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const database = getFirestore(app)