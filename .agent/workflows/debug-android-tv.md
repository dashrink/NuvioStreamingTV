---
description: How to debug and test on Android TV locally
---

# Android TV Local Debugging Guide

This workflow explains how to connect your physical Android TV device to the local development server to debug issues (like the "black screen" on startup).

## Prequisites

1.  **Android TV Device** connected to the **same Wi-Fi network** as your computer.
2.  **USB Debugging** enabled on the TV (Settings -> Device Preferences -> Developer Options).
3.  **ADB** installed on your computer (usually comes with Android Studio or Expo).

## Step 1: Start the Development Server

We have added a special script to start the server in TV mode.

```bash
npm run start:tv
```

This will start the Metro bundler. Keep this terminal open.

## Step 2: Connect via ADB (Wireless)

1.  Find your TV's IP address (Settings -> Network).
2.  Open a **new terminal**.
3.  Connect to the TV:
    ```bash
    adb connect <TV_IP_ADDRESS>
    ```
    *Replace `<TV_IP_ADDRESS>` with your TV's actual IP.*

4.  Verify connection:
    ```bash
    adb devices
    ```
    You should see your TV listed.

## Step 3: Install & Launch the App

Since the previous build failed or had issues, we can try running the debug build directly if you have the `android` folder generated (Prebuild), OR we can use Expo Go (if supported), OR install the debug APK.

**Option A: Using the Debug APK (Recommended)**
If you successfully built a debug APK earlier, install it:
```bash
adb install outputs/apk/debug/app-debug.apk
# (Adjust path if needed)
```

**Option B: Compile and Run Locally (If you have JDK/Android Studio)**
This is the most reliable method for "local testing".
```bash
npx expo run:android --variant debug
```
This will compile the app on your computer and install it on the connected TV.

## Step 4: Viewing Logs

Once the app launches on the TV, switch back to the terminal from **Step 1**. 
You should see logs appearing:

```text
[App] Starting up...
[App] JS Engine: Hermes
[App] isAppReady: true
```

If the screen is black, look for **Errors** or **Warnings** in this log output.

## Troubleshooting "Black Screen"

If the logs show the app is running but the screen is black:
1.  **Shake gesture** (or Press Menu on remote) to open the Expo Dev Menu.
2.  Select **"Reload"**.
3.  If that fails, check if the `Onboarding` screen is rendering off-screen.
