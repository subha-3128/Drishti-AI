import { CheckCircle, Info, Prohibit, ShieldWarning } from '@phosphor-icons/react';

export function SafetyView() {
  return (
    <main className="app-main" aria-labelledby="safety-title">
      <h2 id="safety-title" className="headline-page">
        Safety &amp; Help
      </h2>

      <section className="banner-safety" role="note">
        <ShieldWarning
          size={26}
          weight="bold"
          color="var(--color-tertiary)"
          style={{ flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <p style={{ margin: 0, fontSize: '0.96rem' }}>
          Always continue using your white cane, guide dog, or orientation training.{' '}
          <strong>Drishti AI (दृष्टि)</strong> is a supplementary assistive awareness tool.
        </p>
      </section>

      <section className="setting-card">
        <h3
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--color-secondary)',
            fontSize: '1.1rem',
          }}
        >
          <CheckCircle size={22} weight="bold" aria-hidden="true" />
          <span>What Drishti AI can do</span>
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-muted-foreground)', display: 'grid', gap: 6 }}>
          <li>
            Runs a two-tier on-device vision pipeline: <strong>MediaPipe EfficientDet-Lite0 GPU</strong>{' '}
            for real-time obstacle &amp; approaching-hazard cues, plus <strong>Cactus Mirage</strong>{' '}
            for stairs, barriers, and trees.
          </li>
          <li>
            Delivers concise spoken alerts, stereo directional tones, and optional offline voice
            commands via <strong>Cactus Whistle</strong> (<code>whistle.cact</code>).
          </li>
        </ul>
      </section>

      <section className="setting-card">
        <h3
          style={{
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--color-error)',
            fontSize: '1.1rem',
          }}
        >
          <Prohibit size={22} weight="bold" aria-hidden="true" />
          <span>What Drishti AI cannot do</span>
        </h3>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-muted-foreground)', display: 'grid', gap: 6 }}>
          <li>Never says &ldquo;The road is safe&rdquo; or &ldquo;You can cross now.&rdquo;</li>
          <li>
            Custom Indian ground drop-offs (open drains, potholes, open manholes, broken footpaths,
            auto-rickshaws) are not enabled until evaluated on custom datasets.
          </li>
          <li>Locking the screen or backgrounding Chrome pauses browser camera detection.</li>
        </ul>
      </section>

      <section className="setting-card">
        <h3 style={{ margin: 0, color: 'var(--color-tertiary)', fontSize: '1.1rem' }}>
          Quick controls &amp; privacy
        </h3>
        <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--color-muted-foreground)' }}>
          <strong>Stop quickly:</strong> Tap the crimson Stop Assistance button at the bottom of Live
          Assistance, or say <em>&ldquo;Pause&rdquo;</em> when voice commands are enabled.
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.9rem',
            color: 'var(--color-muted-foreground)',
          }}
        >
          <Info size={20} weight="bold" aria-hidden="true" />
          <span>Privacy: 100% on-device processing. Zero frames or audio uploaded.</span>
        </div>
      </section>
    </main>
  );
}
