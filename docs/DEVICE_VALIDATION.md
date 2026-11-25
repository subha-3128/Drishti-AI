# Drishti AI — Physical Android Device Validation Procedure

> **Status:** Physical Android verification has **not yet been performed**. Do not claim mobile compatibility until every item below is executed on real hardware.

## Verification Separation
- **Automated Tests (`npm test`):** Verified in Node/jsdom (logic, state machine, Mirage adapter, real `cactus.wasm` + `mirage.cact` inference on static fixtures).
- **Desktop Verification (`vite build` / `vite preview`):** Verified production bundle & Service Worker precache (`22.7 MB`, 16 entries).
- **Physical Android Testing:** Required below before any real-world claims.

## Step-by-Step Android Validation Checklist

1. **PWA Installation**
   - Serve `frontend/dist` over HTTPS and open in Android Chrome.
   - Acknowledge the Onboarding Safety Disclaimer.
   - Tap **Install app** / **Add to Home screen** and launch from the home screen.
   - **Expected:** Opens in standalone mode.

2. **Rear Camera Verification**
   - Tap **Start Assistance** and grant camera permission.
   - **Expected:** Rear camera activates; no non-rear camera warning banner appears.

3. **Real Cactus Mirage Inference**
   - Observe AI status in Status Panel.
   - **Expected:** Reports `Ready (Cactus Mirage • cactus-wasm)` and detects people, vehicles, bicycles, dogs, stairs, or barriers without UI freeze.

4. **Airplane Mode & Offline Model Loading**
   - After initial online cache (`Offline Readiness: Online • Model Cached`), enable **Airplane Mode**.
   - Force-close Chrome and reopen the installed PWA.
   - **Expected:** App loads offline (`Offline • Model Cached`), starts assistance, and runs Mirage inference without network.

5. **Offline Voice Availability**
   - Listen for spoken alerts in Airplane Mode.
   - **Expected:** If Status Panel shows `Web Speech (No OS voices loaded)`, install offline English TTS voices in Android **Settings → Accessibility → Text-to-speech output** and re-test.

6. **Screen Lock, Backgrounding & Camera Interruption**
   - Lock the screen or switch apps while active, then return.
   - **Expected:** Assistance pauses immediately, camera stops, and app speaks `"Camera paused. Navigation assistance unavailable."`

7. **Battery & Thermal Behavior**
   - Run for 10–15 minutes while observing device warmth, `ms/frame` latency, and battery drain.
   - **Expected:** Controlled 1-in-flight queue prevents inference backlog.
