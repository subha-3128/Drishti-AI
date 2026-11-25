# DRISHTI AI — MASTER BUILD INSTRUCTIONS FOR ANTIGRAVITY

> **Project:** Drishti AI (दृष्टि)  
> **Tagline:** See the path. Hear the world.  
> **Purpose:** AI-powered assistive navigation for blind and low-vision pedestrians in India.  
> **Instruction:** This file is the primary project specification. Read it completely before making changes.

---

# 1. YOUR ROLE

Act as a senior software architect, AI engineer, Android developer, computer vision engineer, UI/UX designer, QA engineer, and accessibility specialist.

Your mission is to **actually build Drishti AI**, a functional, modular, offline-capable assistive mobility application.

Do not stop at:
- Creating a plan
- Writing documentation only
- Generating mockups
- Creating a nonfunctional UI
- Adding fake AI detection results
- Leaving the entire project as TODOs

You must work directly in the project directory, inspect the environment, create and modify source files, install dependencies when appropriate, run the application, execute tests, fix errors, and maintain clear progress documentation.

If a task cannot be completed because a real model, dataset, device, API, or resource is unavailable, implement the parts that can be completed, document the blocker, and provide a functional fallback.

---

# 2. PRODUCT VISION

Drishti AI is an assistive technology designed to help blind and low-vision people better understand their immediate surroundings while walking.

The application uses a smartphone camera and on-device AI to identify potential hazards and provide concise spoken alerts.

Example alerts:

- "Obstacle ahead."
- "Pothole on your left."
- "Vehicle approaching on your right."
- "Person ahead."
- "Broken pathway in front."
- "Possible open drain ahead."
- "Camera paused. Navigation assistance unavailable."

The app should be optimized for real-world Indian pedestrian environments, including:

- Chennai streets and footpaths
- Uneven sidewalks
- Open drainage channels
- Potholes
- Construction areas
- Roadside vendors
- Crowded footpaths
- Two-wheelers
- Auto-rickshaws
- Cows and dogs
- Waterlogged paths
- Poor lighting
- Narrow pedestrian spaces
- Street clutter
- Unexpected obstacles

The experience must prioritize safety, simplicity, speed, privacy, and accessibility.

---

# 3. TARGET USERS

Primary users:

- Blind pedestrians
- People with low vision
- Users who rely on screen readers
- Users who need spoken environmental awareness

The interface must not depend on the user being able to see the phone screen.

Every critical interaction must be accessible using touch, audio feedback, and screen readers.

---

# 4. NON-NEGOTIABLE SAFETY REQUIREMENTS

This is a safety-sensitive application.

The app is an experimental assistive tool. It is NOT a replacement for:

- A white cane
- A guide dog
- Orientation and mobility training
- Traffic awareness
- Human assistance when needed

## Never do the following:

- Say "The road is safe."
- Say "You can cross now."
- Make crossing decisions.
- Give traffic signal instructions based on uncertain visual detections.
- Promise that all obstacles will be detected.
- Give precise distances unless they have been reliably measured and validated.
- Treat uncertain segmentation as proof of walkable space.
- Encourage users to rely exclusively on the app.

Use caution-oriented language.

If the camera, AI model, or processing pipeline becomes unavailable, alert the user immediately through audio.

The application must communicate its operational state honestly.

---

# 5. DEVELOPMENT APPROACH

## Start by inspecting the existing project

Before creating or overwriting files:

1. Inspect the current directory.
2. Identify existing source files and assets.
3. Identify the operating system and development environment.
4. Check installed Node.js, npm, Python, Android tooling, and Git where available.
5. Check available GPU hardware and memory when relevant.
6. Determine whether an existing application is present.
7. Preserve useful existing work.
8. Avoid destructive operations.

Create a project status document:

`docs/BUILD_STATUS.md`

Track:

- Completed modules
- Current implementation
- Pending modules
- Build errors
- Testing results
- Model availability
- Known limitations
- Next development step

Update this document after each major milestone.

---

# 6. TECHNICAL ARCHITECTURE

Build an Android-first application.

## Preferred direction

Use a modular architecture that supports local AI inference and reliable camera processing.

Evaluate the following options before committing:

### Option A — Native Android

- Kotlin
- Jetpack Compose
- CameraX
- ONNX Runtime Mobile or another suitable on-device inference runtime
- Android TextToSpeech
- Foreground service when justified and permitted
- Android accessibility APIs

### Option B — React-based application

- React
- TypeScript
- Vite
- PWA
- ONNX Runtime Web
- WebGPU where supported
- WebAssembly fallback

### Decision rule

Do not automatically choose a PWA merely because it is easier to develop.

This app needs continuous camera access, real-time processing, audio alerts, and predictable behavior during use.

Evaluate camera lifecycle reliability, foreground operation, device compatibility, performance, offline behavior, and Android integration.

If native Android offers substantially better reliability for the intended use, choose native Android.

If choosing a PWA, clearly document limitations around background operation, screen lock, camera interruptions, and browser suspension.

Make the architecture modular so the AI processing layer can be reused or migrated.

---

# 7. CORE APPLICATION FEATURES

Implement the following in phases.

## Phase 1 — Functional application foundation

Build:

- App launch screen
- Accessible home screen
- Start assistance button
- Stop assistance button
- Camera permission handling
- Rear camera activation
- Live camera feed
- Camera state monitoring
- AI initialization status
- Voice status
- Error state
- Settings
- App information
- Safety disclaimer
- First-time onboarding

The interface should feel like a polished, real assistive technology product.

## Phase 2 — Camera subsystem

Create a dedicated camera module.

Responsibilities:

- Request camera permission
- Open the rear camera
- Capture frames
- Maintain appropriate resolution
- Manage frame timestamps
- Detect camera interruption
- Handle permission denial
- Release camera resources
- Restart when appropriate
- Prevent duplicate camera sessions
- Detect frozen frames where feasible

The AI pipeline must not queue old camera frames indefinitely.

Always prefer the newest available frame. Drop stale frames when processing is slower than capture.

If the camera stops unexpectedly:

1. Stop inference.
2. Mark the camera as unavailable.
3. Alert the user immediately.
4. Attempt recovery safely.
5. Confirm the camera has actually resumed before declaring assistance active.

---

# 8. AI PERCEPTION SYSTEM

Create a modular perception pipeline.

The pipeline should support:

1. Object detection
2. Hazard classification
3. Semantic segmentation
4. Object tracking
5. Direction estimation
6. Relative depth estimation, if useful
7. Temporal validation
8. Alert prioritization

Do not make all features dependent on one giant model.

Each module should be independently testable.

## 8.1 Object detection

Use a lightweight model appropriate for mobile devices.

Evaluate suitable candidates such as:

- YOLO nano/small variants
- MobileNet-based detectors
- Other efficient ONNX-compatible detection models

Model selection must consider:

- Accuracy
- Model size
- Inference speed
- License
- Mobile compatibility
- Training feasibility
- Export compatibility

Do not assume a pretrained model recognizes Indian pedestrian hazards adequately.

A pretrained COCO model may identify people, cars, dogs, bicycles, and similar categories, but it is not sufficient for custom classes such as open drains and broken footpaths.

## 8.2 Initial hazard categories

Create a configurable class registry.

Start with:

### Dynamic obstacles

- Person
- Motorcycle
- Car
- Auto-rickshaw
- Bus
- Truck
- Bicycle
- Dog
- Cow

### Static or infrastructure hazards

- Pothole
- Open manhole
- Open drain
- Broken footpath
- Construction debris
- Barricade
- Pole
- Low-hanging obstacle
- Stair
- Curb
- Speed breaker
- Waterlogged area

The model may not support all classes initially.

Only activate a hazard category when a corresponding detection capability actually exists.

Never present unsupported detections as real AI results.

---

# 9. INDIAN DATASET STRATEGY

Design a separate dataset preparation and model training workspace.

Potential dataset sources:

- India Driving Dataset (IDD)
- RDD2022
- Open pothole datasets
- Open manhole datasets
- Sidewalk segmentation datasets
- Custom images and videos collected in India

Important dataset sources to investigate:

IDD:
https://idd.insaan.iiit.ac.in/dataset/details/

RDD2022:
https://crddc2022.sekilab.global/data/

Dataset tools:

- CVAT
- Label Studio
- Roboflow, subject to export and licensing suitability

## Dataset rules

Before downloading or using any dataset:

1. Verify the source.
2. Check the license.
3. Record attribution requirements.
4. Record commercial-use restrictions.
5. Record research-only restrictions.
6. Document the classes.
7. Document differences in camera perspective.
8. Do not mix train and test images from the same recording sequence.

Driving datasets may be useful for vehicles and road scene understanding, but they are not a substitute for pedestrian-height imagery.

## Custom dataset

Plan for a custom Indian pedestrian dataset.

Capture images from approximately smartphone walking height, across:

- Chennai
- Busy streets
- Residential roads
- Footpaths
- Market areas
- Commercial areas
- Construction zones
- Daytime
- Evening
- Night
- Rain
- Wet roads
- Shadows
- Crowded environments

Do not collect images in a way that puts the developer or volunteers at risk.

Respect privacy.

Avoid unnecessary identification of people. Blur faces and vehicle registration plates when publishing datasets.

## Dataset tools

Create scripts for:

- Dataset downloading where permitted
- Dataset conversion
- Label validation
- Duplicate detection
- Train/validation/test splitting
- Class distribution analysis
- Image visualization
- Annotation checks
- Dataset documentation

---

# 10. MODEL TRAINING PIPELINE

Create a separate AI training workspace.

Use Python and PyTorch where suitable.

Provide reproducible training configurations.

The training pipeline should support:

1. Dataset preparation
2. Annotation validation
3. Preprocessing
4. Augmentation
5. Model training
6. Validation
7. Metrics
8. Error analysis
9. Export
10. ONNX validation
11. Quantization experiments
12. Mobile benchmarking

Training should not be required to run every time the application starts.

The application should load prebuilt models.

## Training requirements

- Use small models first.
- Use low-memory configurations.
- Make batch size configurable.
- Support CUDA when available.
- Support CPU fallback.
- Avoid unnecessary GPU memory usage.
- Save checkpoints.
- Support resuming interrupted training.
- Save logs and metrics.
- Provide clear instructions for Colab or alternative GPU environments.

Do not fabricate trained weights.

If no trained hazard-specific model exists, create a documented integration placeholder and use only genuine pretrained models for supported classes.

---

# 11. SEMANTIC SEGMENTATION

Investigate lightweight semantic segmentation models.

The segmentation system should distinguish concepts such as:

- Walkable sidewalk
- Road
- Non-walkable region
- Obstacle region

Segmentation is a supporting perception component—not proof that a surface is safe.

A road may appear visually walkable.

A sidewalk may contain an unseen hazard.

A segmentation model may make serious mistakes.

Evaluate false-safe behavior, especially:

**Road incorrectly classified as sidewalk.**

Measure class-specific performance rather than relying only on aggregate accuracy.

Do not produce "safe path" messages based solely on segmentation.

---

# 12. RELATIVE DEPTH ESTIMATION

Investigate lightweight relative-depth models such as MiDaS Small or other mobile-compatible alternatives.

Depth estimation is optional for the first MVP.

If integrated:

- Treat it as relative depth, not accurate measured distance.
- Evaluate performance on mobile.
- Avoid unsupported meter-based alerts.
- Use it only as an additional signal.
- Never allow depth estimation alone to determine that an obstacle is harmless.

If depth is unreliable or unavailable, the system must still function with detection and directional alerts.

---

# 13. DIRECTION ESTIMATION

Create a dedicated direction module.

Possible outputs:

- Left
- Center
- Right

Direction must be calculated relative to the user's forward-facing camera orientation.

Do not rely exclusively on the bounding box center.

Consider:

- Camera angle
- Detection position
- Walking corridor
- Object size
- Tracking stability
- Segmentation boundaries, if available
- Camera orientation changes

The app must not claim that a hazard is directly in the walking path unless there is adequate evidence.

Use simple, understandable alert language.

Examples:

- "Possible obstacle on the left."
- "Pothole ahead, center."
- "Vehicle on your right."
- "Uneven pathway ahead."

If directional confidence is poor, use "ahead" rather than guessing left or right.

---

# 14. HAZARD ENGINE

Create a standalone hazard-analysis engine.

Responsibilities:

- Receive AI detections
- Normalize detections
- Filter low-confidence results
- Track detections across frames
- Estimate relative urgency
- Determine direction
- Suppress repeated alerts
- Prioritize important hazards
- Produce short alert messages

## Priority system

### P0 — Critical

Potentially immediate serious hazard.

### P1 — Urgent

Significant nearby obstacle or hazard.

### P2 — Caution

Potential obstacle or relevant environmental information.

### P3 — Informational

Low-priority contextual information.

Priority levels must be configurable and validated.

The system must avoid overwhelming the user with continuous speech.

If a critical alert occurs, lower-priority alerts may be suppressed.

## Duplicate suppression

Implement:

- Object tracking or short-term association
- Per-object alert cooldown
- Temporal confidence validation
- Repeated alert suppression
- Alert expiration
- Priority-aware interruption

Never endlessly repeat the same message because an object remains in the frame.

---

# 15. VOICE SYSTEM

Voice is a primary interaction method.

Implement a dedicated speech module.

Evaluate:

- Android TextToSpeech
- Browser SpeechSynthesis
- Paradee ONNX
- Other offline TTS alternatives if useful

Paradee candidate:
https://github.com/sahilmahendrakar/paradee

Do not assume a library's Python interface can be used directly in a browser.

Verify how to integrate the selected TTS engine with the chosen platform.

## Requirements

- English alerts initially
- Clear pronunciation
- Short sentences
- Configurable speech rate
- Configurable volume where supported
- No overlapping speech
- Priority-aware speech queue
- Ability to interrupt lower-priority messages
- Spoken camera/system failure notifications
- Offline speech capability when supported

If offline speech is unavailable, make that limitation clear during setup.

## Alert examples

"Obstacle ahead."

"Pothole on your right."

"Vehicle approaching from your left."

"Possible open drain ahead."

"Camera stopped. Assistance unavailable."

"AI is initializing."

"Assistance started."

"Assistance stopped."

Avoid long explanations during walking.

---

# 16. ACCESSIBLE UI AND BRANDING

Brand:

**Drishti AI — दृष्टि**

Tagline:

**See the path. Hear the world.**

Design direction:

- Premium
- Calm
- Modern
- Indian-inspired
- Minimal
- Trustworthy
- High contrast
- Voice-first

Avoid childish designs.

Avoid visually cluttered screens.

Do not use tiny text.

Do not make essential controls dependent on color.

## Home screen

Provide:

- App logo
- App name
- Start Assistance button
- Stop Assistance button when active
- Camera status
- AI status
- Voice status
- Offline readiness
- Settings
- Safety information

## Accessibility requirements

- Large touch targets
- Screen-reader labels
- Proper semantic controls
- High contrast
- Screen reader compatibility
- Voice feedback
- Haptic feedback where supported
- Minimal navigation
- Accessible error states
- Accessible permission instructions

The Start button must be easy to locate and activate.

The Stop button must be immediately available.

---

# 17. APP STATE MANAGEMENT

Use an explicit application state machine.

Suggested states:

- `idle`
- `requesting_permission`
- `initializing_models`
- `starting_camera`
- `active`
- `paused`
- `camera_error`
- `model_error`
- `processing_error`
- `stopping`

Prevent invalid state transitions.

Do not mark the app as active until:

- Camera is actually running
- Required models are loaded
- AI initialization has completed
- Voice output is available or its limitation has been clearly reported

When an essential component fails, transition into a clear failure state.

---

# 18. OFFLINE-FIRST ARCHITECTURE

The application must work offline after initial installation and model preparation.

Requirements:

- Cache application resources
- Store models locally
- Store settings locally
- Avoid unnecessary network calls
- Provide offline status
- Provide model installation status
- Verify model files
- Handle interrupted downloads
- Support recovery from corrupted cache
- Avoid deleting a working model before a replacement is verified

Create a model manifest containing:

- Model name
- Version
- File size
- SHA-256 checksum where available
- Source
- License
- Supported classes
- Input size
- Required runtime
- Installation status

Do not silently download large model files during active walking.

Model downloads and initial setup should occur before use, with clear progress information.

Do not claim offline capability until it has actually been tested with network access disabled.

---

# 19. PERFORMANCE

Optimize for ordinary Android phones, not only high-end devices.

Implement:

- Efficient frame processing
- Frame dropping
- Resolution control
- Inference scheduling
- Model quantization where appropriate
- Worker-thread processing if the architecture supports it
- Memory management
- Thermal awareness
- Battery-aware operation

Initial performance targets are hypotheses, not guaranteed requirements.

Suggested targets for benchmarking:

- Camera capture: approximately 15 FPS
- Object detection: approximately 8–12 FPS
- Segmentation: approximately 2–4 FPS
- Low latency between hazard recognition and voice alert
- Avoid UI freezes
- Avoid excessive heat

Benchmark real devices before making performance claims.

If the device becomes too slow or overheats:

1. Reduce inference frequency.
2. Reduce resolution.
3. Disable optional modules.
4. Alert the user if performance becomes inadequate.
5. Stop processing safely if required.

---

# 20. PRIVACY

Privacy by design.

The initial application should process camera frames locally.

Do not:

- Upload camera frames
- Record walking videos by default
- Store images of people unnecessarily
- Collect location unnecessarily
- Add analytics that expose sensitive information

If any cloud feature is introduced in the future, it must be optional, clearly explained, and consent-based.

The app should make its camera state obvious through accessible indicators and voice announcements.

---

# 21. RECOMMENDED PROJECT STRUCTURE

Adapt this structure to the selected framework.

```text
Drishti-AI/
│
├── frontend/
│   ├── public/
│   │   ├── icons/
│   │   ├── models/
│   │   └── manifest/
│   │
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── accessibility/
│   │   ├── camera/
│   │   ├── ai/
│   │   │   ├── detection/
│   │   │   ├── segmentation/
│   │   │   ├── depth/
│   │   │   ├── tracking/
│   │   │   └── inference/
│   │   ├── safety/
│   │   │   ├── hazard-engine/
│   │   │   ├── direction/
│   │   │   ├── priority/
│   │   │   └── validation/
│   │   ├── voice/
│   │   ├── storage/
│   │   ├── workers/
│   │   ├── settings/
│   │   └── tests/
│   │
├── ai-training/
│   ├── datasets/
│   ├── annotations/
│   ├── configs/
│   ├── scripts/
│   ├── checkpoints/
│   ├── evaluation/
│   └── export/
│
├── ai-models/
│   ├── detector/
│   ├── segmentation/
│   ├── depth/
│   └── model-manifest.json
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATASET_GUIDE.md
│   ├── MODEL_TRAINING.md
│   ├── SAFETY.md
│   ├── TESTING.md
│   └── BUILD_STATUS.md
│
├── tests/
│
├── README.md
├── LICENSE
└── ANTIGRAVITY_MASTER_PROMPT.md
```

Keep modules small, independent, maintainable, and testable.

---

# 22. DEVELOPMENT MILESTONES

Implement in the following order.

## Milestone 1 — Project foundation

- Inspect environment
- Decide and document platform
- Scaffold project
- Install dependencies
- Create modular structure
- Create README
- Create build status tracker
- Run initial build

## Milestone 2 — UI and accessibility

- Build home screen
- Build settings
- Implement accessible buttons
- Screen reader support
- High contrast
- Haptics where supported
- Safety disclaimer
- Onboarding

## Milestone 3 — Camera

- Camera permissions
- Rear camera
- Live feed
- Camera lifecycle
- Start/stop
- Camera errors
- Frame capture
- Frame dropping

## Milestone 4 — AI infrastructure

- Model loader
- Model manifest
- Runtime initialization
- Worker integration
- Preprocessing
- Postprocessing
- Inference logging
- Error recovery

## Milestone 5 — First real detector

Integrate a real pretrained detector for supported categories.

Test with:

- People
- Cars
- Dogs
- Motorcycles
- Bicycles
- Other available categories

Verify the output with real images.

Do not display random or simulated detections as actual AI.

## Milestone 6 — Hazard engine

- Direction
- Temporal validation
- Tracking
- Priority
- Cooldowns
- Alert formatting
- Speech queue

## Milestone 7 — Voice alerts

- Offline TTS investigation
- Integration
- Alert queue
- Priority handling
- Speech rate
- Error alerts
- Haptic feedback

## Milestone 8 — Offline operation

- Cache
- Model storage
- Integrity validation
- Offline startup
- Offline inference
- Offline TTS testing

## Milestone 9 — Hazard-specific training

- Dataset acquisition
- License tracking
- Annotation
- Training
- Evaluation
- ONNX export
- Integration

## Milestone 10 — Segmentation and optional depth

Only add these after the first working detection-to-voice pipeline is stable.

## Milestone 11 — Testing

- Unit tests
- Integration tests
- Camera tests
- AI tests
- Hazard-engine tests
- Voice tests
- Offline tests
- Performance tests
- Accessibility tests

## Milestone 12 — Finalization

- Fix bugs
- Improve performance
- Update documentation
- Verify installation
- Prepare demo
- Report remaining limitations

---

# 23. TESTING REQUIREMENTS

Create automated tests wherever possible.

## Unit tests

Test:

- Direction calculation
- Alert wording
- Hazard priority
- Confidence thresholds
- Cooldown
- Duplicate suppression
- State transitions
- Model manifest validation

## AI tests

Use a known test set.

Measure:

- Precision
- Recall
- Per-class performance
- False negatives
- False positives
- Performance under poor lighting
- Performance with occlusion
- Performance on different perspectives

Do not report only aggregate accuracy.

## Camera tests

- Permission granted
- Permission denied
- Camera unavailable
- Camera interruption
- Camera recovery
- Start/stop repeatedly
- Device rotation
- App backgrounding

## Offline tests

Disable internet.

Verify:

- App opens
- Camera works
- Models load
- Inference works
- Alerts work
- TTS works if the chosen engine is truly offline

## Performance tests

Measure:

- Camera FPS
- Detector FPS
- Inference latency
- End-to-end alert latency
- CPU usage
- Memory usage
- Battery consumption
- Thermal behavior

---

# 24. SAFETY VALIDATION

Never test this application by asking a blind person to navigate dangerous areas without supervision.

Testing stages:

1. Offline images
2. Recorded video
3. Stationary camera tests
4. Controlled obstacle environment
5. Supervised walking with sighted observers
6. Accessibility evaluation with informed and consenting participants
7. Mobility-specialist review

Use the cane or guide dog during testing.

Do not begin unsupervised real-world navigation trials merely because the application runs.

Suggested evaluation goals, to be validated rather than assumed:

- High recall for critical hazards
- Reliable camera failure detection
- Low duplicate-alert rate
- Acceptable end-to-end alert latency
- No misleading safe-crossing messages
- No unreported AI failures

---

# 25. DOCUMENTATION

Maintain the following documentation as the project evolves.

## README.md

Include:

- Project overview
- Features
- Architecture
- Installation
- Development setup
- Running the app
- Model setup
- Offline behavior
- Testing
- Limitations
- Safety disclaimer

## ARCHITECTURE.md

Explain:

- Platform
- Components
- Data flow
- AI pipeline
- Camera system
- Voice system
- Storage
- Offline architecture

## DATASET_GUIDE.md

Explain:

- Dataset sources
- Licenses
- Class definitions
- Annotation process
- Data splits
- Privacy
- Quality checks

## MODEL_TRAINING.md

Explain:

- Environment setup
- Dataset preparation
- Training commands
- Configuration
- Checkpoints
- Evaluation
- ONNX export

## SAFETY.md

Explain:

- Known failure modes
- Safety principles
- Limitations
- Testing protocols
- Failure handling
- Appropriate use

## BUILD_STATUS.md

Maintain a clear and honest implementation status.

---

# 26. WORKING RULES FOR ANTIGRAVITY

1. Read this file before implementation.
2. Inspect the existing directory before changing anything.
3. Do not destroy existing work.
4. Make sensible engineering decisions independently.
5. Do not ask unnecessary questions.
6. Ask only when genuinely blocked by an important decision that cannot reasonably be inferred.
7. Use free and open-source technologies where practical.
8. Check licenses before using models, datasets, and dependencies.
9. Do not fabricate models, metrics, datasets, test results, or capabilities.
10. Do not leave the application as a static demo.
11. Do not use fake detections to simulate AI functionality in the real app.
12. If a placeholder is needed, label it explicitly as a placeholder.
13. Run the build after meaningful changes.
14. Run relevant tests.
15. Fix errors rather than ignoring them.
16. Keep the project organized.
17. Document architectural decisions.
18. Maintain BUILD_STATUS.md.
19. Do not implement all complex features at once; prioritize a working MVP.
20. Continue development through milestones instead of stopping after the first scaffold.

If a model cannot be downloaded, create the integration interface and document exactly how it can be supplied later.

If a device-specific feature cannot be verified, clearly mark it unverified.

---

# 27. MVP ACCEPTANCE CRITERIA

The first functional MVP is complete when:

- [ ] Application launches successfully.
- [ ] App has Drishti AI branding.
- [ ] UI is accessible.
- [ ] Start button works.
- [ ] Stop button works.
- [ ] Rear camera activates correctly.
- [ ] Camera status is reported.
- [ ] At least one real AI model loads.
- [ ] Supported objects are genuinely detected.
- [ ] Detection direction can be estimated.
- [ ] Hazard engine filters repeated detections.
- [ ] Alerts are spoken.
- [ ] Alert priority is implemented.
- [ ] Camera failure triggers a warning.
- [ ] AI failure triggers a warning.
- [ ] App does not falsely report itself as active.
- [ ] App can function offline after setup, as claimed.
- [ ] Build succeeds.
- [ ] Tests pass or failures are documented.
- [ ] README is complete.
- [ ] Safety limitations are visible and communicated.

Custom Indian hazard classes may be added progressively, but they must not be falsely claimed as operational before trained models are integrated and evaluated.

---

# 28. FIRST TASK — START BUILDING NOW

After reading this master prompt:

### Step 1
Inspect the project directory and environment.

### Step 2
Make a short technical decision about the development platform, based on reliability and the project requirements.

### Step 3
Create `docs/BUILD_STATUS.md` and record the initial status.

### Step 4
Create the project structure.

### Step 5
Implement Milestone 1 and begin Milestone 2.

### Step 6
Run the application and verify that it launches.

### Step 7
Continue into camera implementation.

Do not respond to this file with only another long plan.

Start making actual code changes in the project folder.

When you encounter limitations, adapt intelligently, document them, and continue building what is possible.

---

# FINAL PRODUCT GOAL

Build **Drishti AI — दृष्टि**, an Indian-inspired, AI-powered assistive mobility application that helps blind and low-vision pedestrians become more aware of nearby obstacles through real-time camera perception and concise voice alerts.

The product should be:

- Practical
- Accessible
- Offline-first
- Privacy-focused
- Modular
- Efficient
- Honest about AI limitations
- Designed for Indian streets
- Easy to use while walking
- Built with safety as the highest priority

**Brand:** Drishti AI  
**Tagline:** See the path. Hear the world.

**Begin implementation now.**