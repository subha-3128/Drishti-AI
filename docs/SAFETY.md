# Drishti AI — Safety & Limitations

## Non-Negotiable Safety Principles
- Drishti AI is an **experimental assistive tool**, NOT a replacement for a white cane, guide dog, orientation & mobility training, traffic awareness, or human assistance.
- The app **never** says "the road is safe" or "you can cross now" and never makes traffic-signal decisions.
- The app **never** announces unverified distances or approaching-motion claims.
- Only validated obstacle categories mapped from real Cactus Mirage outputs are active; Indian street hazards (`pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`) remain disabled until evaluated on documented Indian pedestrian datasets.

## Failure Handling
- **Camera permission denied / stream ended / frozen frame:** Inference stops immediately, app transitions to `camera_error`, and `VoiceEngine.speakImmediateSystem` alerts the user.
- **Model checksum mismatch or load failure:** Existing valid cache is preserved, app transitions to `model_error`, and the user is alerted via speech.
- **Worker timeout / inference crash:** Worker terminates cleanly, attempts 1x controlled recovery on timeout, and stops with an immediate spoken error if unrecoverable.
- **App backgrounded / screen locked:** Assistance pauses safely and announces `"Camera paused. Navigation assistance unavailable."`
