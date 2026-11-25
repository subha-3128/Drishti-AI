# Drishti AI — Physical Android Device Validation Procedure

> **Purpose:** Verify real-world rear camera, offline PWA caching, ONNX inference, and offline voice alerts on a physical Android phone.

## Prerequisites
- Android phone with Chrome (or Edge) and a working rear camera.
- Serve the production build over HTTPS (required for `getUserMedia` and Service Workers on mobile, e.g., via `vite preview` behind a local HTTPS tunnel or static host).

## Step-by-Step Validation Checklist

1. **Install PWA**
   - Open the HTTPS URL in Android Chrome.
   - Complete the Onboarding Safety Disclaimer.
   - Tap **Install app** / **Add to Home screen** from Chrome's menu.
   - **Expected:** App icon appears on home screen; opens in standalone mode.

2. **Initial Online Model Caching**
   - Tap **Start Assistance** once while online, grant camera permission, and wait until status shows `Ready (YOLOX-Nano...)`.
   - Tap **Stop Assistance**.
   - **Expected:** Status panel shows `Offline Readiness: Online • Model Cached`.

3. **Airplane Mode & Browser Restart**
   - Enable **Airplane Mode** (Wi-Fi and mobile data OFF).
   - Force-close the PWA and Chrome completely, then reopen the Drishti AI PWA from the home screen.
   - **Expected:** App shell loads offline; Status panel shows `Offline • Model Cached`.

4. **Offline Camera + AI Inference + Voice**
   - Tap **Start Assistance** while still in Airplane Mode.
   - Point the rear camera at a person, chair, or parked vehicle.
   - **Expected:**
     - Rear camera activates; no network errors.
     - Bounding box appears (if preview enabled) and spoken alert plays (e.g., `"Person ahead."`).
     - If Status panel reports `Web Speech (No OS voices loaded)`, install offline English TTS data in Android **Settings → Accessibility → Text-to-speech output**.

5. **Screen-Lock & Interruption Safety**
   - While active, lock the phone screen or switch to another app, then unlock.
   - **Expected:** App pauses assistance, stops camera, and announces `"Camera paused. Navigation assistance unavailable."` Never falsely reports `active`.
