import { CheckCircle, ShieldWarning, SpeakerHigh, Camera } from '@phosphor-icons/react';

interface OnboardingViewProps {
  onComplete: () => void;
}

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  return (
    <section className="card" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title" style={{ marginTop: 0 }}>
        Welcome to Drishti AI (दृष्टि)
      </h2>
      <p>
        Drishti AI uses your phone&apos;s rear camera and on-device AI to announce nearby obstacles
        with short spoken alerts.
      </p>

      <div className="alert-banner alert-banner--warning" role="note" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 6 }}>
          <ShieldWarning size={24} weight="bold" aria-hidden="true" />
          <span>Important Safety Notice</span>
        </div>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Drishti AI is an experimental assistive tool, not a primary mobility aid.</li>
          <li>It does NOT replace a white cane, guide dog, or traffic awareness.</li>
          <li>It will never tell you that a road is safe or when to cross.</li>
          <li>Keep the screen awake while walking; locking the screen pauses camera detection.</li>
        </ul>
      </div>

      <div style={{ display: 'grid', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Camera size={24} weight="bold" aria-hidden="true" />
          <span>Requires rear camera permission for local, on-device processing only.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SpeakerHigh size={24} weight="bold" aria-hidden="true" />
          <span>Uses your device&apos;s speech synthesis for concise obstacle alerts.</span>
        </div>
      </div>

      <button type="button" className="primary-cta" onClick={onComplete}>
        <CheckCircle size={28} weight="bold" aria-hidden="true" />
        <span>I Understand — Continue</span>
      </button>
    </section>
  );
}
