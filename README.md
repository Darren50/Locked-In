# Setting up Locked-In

## 1. Prerequisites

### Hardware Required

### If you do not have any/all the required hardware, please refer to our video to see the bot 😃
### Alternatively,  you can contact us via Telegram if you would like to see a live video demo!

- Raspberry Pi 5
- Waveshare 2.8" LCD (A) HAT (ILI9341, 320x240)
- Raspberry Pi Camera Module 3
- USB Microphone
- USB Mini Speaker

  

### Accounts Required

- Google account (for Firebase)
- GitHub account

## 2. Firebase Setup

This must be done first as both the bot and web app depend on it.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. Enable **Firestore Database** (start in test mode)
3. Enable **Authentication** → Sign-in method → Email/Password
4. The following Firestore collections will be created automatically:

```
users/{uid}/tasks/
users/{uid}/sessions/
```

### Updating Firebase Security Rules

This makes it so that: 
- Only authenticated users can access data. 
- Each user can only read and write their own data (`users/{their uid}/...`).
- No user can access another user's tasks, sessions, or stats.

1. Go to the [Firebase Console](https://console.firebase.google.com/) and select the project you created
2. In the left sidebar, click **Firestore Database**, then select the **Rules** tab
3. Replace the existing rules with the following:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

4. Click **Publish**.

### Get Web App Credentials

5. Go to **Project Settings → General → Your apps → Add app → Web**
6. Copy the Firebase config object (you will need this for the web app `.env` file)

### Get Bot Service Account Key

7. Go to **Project Settings → Service Accounts**
8. Click **Generate new private key**
9. Download the JSON file, save it as `firebase-key.json`
10. Copy it to your Pi at `/home/user/firebase-key.json`

## 3. Bot Setup (Raspberry Pi 5)

### 3.1 Flash OS

- Use **Raspberry Pi OS Bookworm 64-bit** (full desktop)
- Flash with Raspberry Pi Imager

### 3.2 Configure `/boot/firmware/config.txt`

Add the following lines to the config file:

```ini
dtparam=spi=on
dtoverlay=waveshare28a-v2
dtoverlay=ads7846,cs=1,penirq=17,penirq_pull=2,speed=50000,keep_vref_on=1,pmax=255,xohms=60
hdmi_force_hotplug=1
max_usb_current=1
camera_auto_detect=1
```

Reboot after editing.

### 3.3 Verify Hardware

After reboot, verify the following:

```bash
# LCD framebuffer should exist
ls /dev/fb1

# Camera should be detected
libcamera-hello --nopreview

# GPIO chip (use gpiochip0, NOT gpiochip4)
gpiodetect
```

### 3.4 Clone the Repo

```bash
git clone git@github.com:Darren50/Locked-In.git
cd Locked-In
```

### 3.5 Install Python Dependencies

Use `--break-system-packages` on Bookworm, or set up a venv:

```bash
pip install --break-system-packages \
  pillow \
  numpy \
  lgpio \
  picamera2 \
  mediapipe \
  firebase-admin
```

### 3.6 Add Firebase Key

Copy your `firebase-key.json` (downloaded from Firebase Console) to:

```
/home/user/firebase-key.json
```

### 3.7 Set Your Firebase User UID

Open `bot/pomodoro.py` and update this line with your user UID (found in Firebase Console → Authentication → Users):

```python
USER_UID = "your-uid-here"
```

### 3.8 Hardware Pin Reference

| Button | GPIO Pin |
| ------ | -------- |
| KEY1   | 4        |
| KEY2   | 23       |
| KEY3   | 24       |
| KEY4   | 25       |

## 4. Web App Setup

### 4.1 Install Node.js

Download and install Node.js (v18+) from [nodejs.org](https://nodejs.org).

### 4.2 Clone the Repo

```bash
git clone https://github.com/Darren50/Locked-In.git
cd Locked-In/web
```

### 4.3 Install Dependencies

```bash
npm install
```

### 4.4 Create Your `.env` File

Create a file called `.env` in the `web/` folder and fill in the values from your Firebase config:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 4.5 Run Locally

```bash
npm run dev
```

Open <http://localhost:5173> in your browser.

### 4.6 Deploy to Firebase Hosting (Optional)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy
```

## 5. Running the System

### Start the Bot

```bash
cd ~/Locked-In
python3 bot/pomodoro.py
```

### Start the Web App (Development)

```bash
cd Locked-In/web
npm run dev
```

### Bot Screen Navigation

| Screen      | Button | Action                              |
| ----------- | ------ | ----------------------------------- |
| Idle        | K1     | Start timer → Pomodoro screen       |
| Idle        | K2     | Open task list                      |
| Pomodoro    | K1     | Pause / Resume                      |
| Pomodoro    | K2     | Skip phase                          |
| Pomodoro    | K3     | End session (confirm)               |
| Pomodoro    | K4     | Back to idle (timer keeps running)  |
| Tasks       | K1     | Open task detail                    |
| Tasks       | K2     | Scroll up                           |
| Tasks       | K3     | Scroll down                         |
| Tasks       | K4     | Back to idle                        |
| Task Detail | K1     | Toggle done                         |
| Task Detail | K2     | Previous task                       |
| Task Detail | K3     | Next task                           |
| Task Detail | K4     | Back to task list                   |



