# Drishti AI — Safety & Limitations

## Non-Negotiable Safety Principles
- Drishti AI is an **experimental assistive tool**, NOT a replacement for a white cane, guide dog, orientation & mobility training, traffic awareness, or human assistance.
- The app **never** states "the road is safe" or "you can cross now" and never makes traffic-signal decisions.
- Caution-oriented language is enforced; unsupported Indian hazard classes (`pothole`, `open_drain`, `open_manhole`, `broken_footpath`, `auto_rickshaw`) remain disabled in `classRegistry.ts` until a dedicated model is trained and validated.

## Failure Handling
- **Camera permission denied / stream ended / frozen frame:** Inference stops immediately, app transitions to `camera_error`, and `VoiceEngine.speakImmediateSystem` alerts the user.
- **Model checksum mismatch or load failure:** Existing valid cache is preserved, app transitions to `model_error`, and the user is alerted via speech.
- **App backgrounded / screen locked:** Assistance pauses safely and announces unavailability.
