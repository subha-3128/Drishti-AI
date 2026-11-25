import { ShieldWarning, Info } from '@phosphor-icons/react';

export function SafetyView() {
  return (
    <section className="card" aria-labelledby="safety-title">
      <h2 id="safety-title" style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldWarning size={24} weight="bold" aria-hidden="true" />
        <span>Safety &amp; Limitations</span>
      </h2>

      <p>
        <strong>Drishti AI (दृष्टि)</strong> is an experimental assistive awareness tool. It is{' '}
        <strong>not</strong> a replacement for a white cane, guide dog, orientation and mobility
        training, traffic awareness, or human assistance.
      </p>

      <h3>What Drishti AI Never Does</h3>
      <ul>
        <li>Never says &ldquo;The road is safe&rdquo; or &ldquo;You can cross now.&rdquo;</li>
        <li>Never makes traffic-signal or street-crossing decisions.</li>
        <li>Never announces unverified distances or approaching-motion predictions.</li>
        <li>Never guarantees detection of all obstacles.</li>
      </ul>

      <h3>Current Model Coverage &amp; Honest Limits</h3>
      <ul>
        <li>
          Drishti AI runs <strong>Cactus Mirage</strong> (<code>mirage.cact</code> via Cactus
          WebAssembly) on-device to identify supported obstacles such as people, vehicles,
          bicycles, dogs, stairs, barriers, and static obstacles.
        </li>
        <li>
          Custom Indian street hazards (open drains, potholes, broken footpaths, open manholes,
          auto-rickshaws) are <strong>not</strong> enabled until evaluated and validated on real
          Indian pedestrian datasets.
        </li>
        <li>
          <strong>PWA Browser Limitation:</strong> Locking the phone screen or switching apps
          suspends the browser camera and stops detection. Keep the app in the foreground.
        </li>
        <li>
          <strong>Offline Voice Limitation:</strong> Speech output uses your browser&apos;s Web
          Speech API; offline availability depends on OS-installed voices. Offline voice commands
          via Cactus Whistle are planned for a future release.
        </li>
      </ul>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, color: 'var(--color-muted-foreground)' }}>
        <Info size={20} weight="bold" aria-hidden="true" />
        <span>Privacy: All camera frames are processed locally on your device. Nothing is uploaded.</span>
      </div>
    </section>
  );
}
