import { useState } from 'react';
import {
  Camera,
  CheckCircle,
  LockKey,
  ShieldWarning,
  SpeakerHigh,
} from '@phosphor-icons/react';

interface OnboardingViewProps {
  onComplete: () => void;
}

const SLIDES = [
  {
    id: 0,
    tab: '1. Camera',
    icon: Camera,
    title: 'Camera awareness',
    body: 'Understand nearby obstacles using your rear camera and on-device real-time vision.',
  },
  {
    id: 1,
    tab: '2. Voice',
    icon: SpeakerHigh,
    title: 'Voice guidance',
    body: 'Hear concise spoken alerts and directional stereo tones without staring at the screen.',
  },
  {
    id: 2,
    tab: '3. Privacy',
    icon: LockKey,
    title: 'Privacy first',
    body: 'All image and speech processing runs locally on your phone. Zero frames are uploaded.',
  },
];

export function OnboardingView({ onComplete }: OnboardingViewProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  const active = SLIDES[slideIdx];
  const SlideIcon = active.icon;

  return (
    <section className="app-main" aria-labelledby="onboarding-title">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h2 id="onboarding-title" className="headline-page">
          Welcome to Drishti AI
        </h2>
        <p style={{ margin: 0, color: 'var(--color-muted-foreground)', fontSize: '0.95rem' }}>
          Explore the world with greater awareness using on-device vision and concise spoken alerts.
        </p>
      </div>

      {/* Onboarding 3-step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} aria-label="Onboarding steps">
        <div
          role="progressbar"
          aria-valuenow={slideIdx + 1}
          aria-valuemin={1}
          aria-valuemax={3}
          style={{ display: 'flex', gap: 6, flex: 1 }}
        >
          {SLIDES.map((s) => (
            <span
              key={s.id}
              style={{
                height: 8,
                flex: 1,
                borderRadius: 9999,
                background:
                  s.id <= slideIdx ? 'var(--color-primary)' : 'var(--color-surface-highest)',
              }}
            />
          ))}
        </div>
        <span
          className="font-mono"
          style={{ fontSize: '0.85rem', color: 'var(--color-muted-foreground)' }}
        >
          {slideIdx + 1} of 3
        </span>
      </div>

      <article className="card-elevated" aria-live="polite">
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'var(--color-primary-container)',
            color: 'var(--color-on-primary-container)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SlideIcon size={28} weight="bold" aria-hidden="true" />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.35rem' }}>{active.title}</h3>
        <p style={{ margin: 0, color: 'var(--color-muted-foreground)', fontSize: '1.05rem' }}>
          {active.body}
        </p>
      </article>

      <div
        role="tablist"
        aria-label="Onboarding topics"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
      >
        {SLIDES.map((s) => {
          const selected = s.id === slideIdx;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setSlideIdx(s.id)}
              style={{
                minHeight: 48,
                borderRadius: 14,
                fontSize: '0.85rem',
                fontWeight: 600,
                background: selected ? 'var(--color-surface-highest)' : 'var(--color-surface-container)',
                color: selected ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                border: selected
                  ? '2px solid var(--color-tertiary)'
                  : '1px solid var(--color-border)',
              }}
            >
              {s.tab}
            </button>
          );
        })}
      </div>

      <section className="banner-safety" role="note" aria-label="Important safety notice">
        <ShieldWarning
          size={24}
          weight="bold"
          color="var(--color-tertiary)"
          style={{ flexShrink: 0, marginTop: 2 }}
          aria-hidden="true"
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <strong style={{ fontSize: '1rem' }}>Important Safety Notice</strong>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.92rem', color: 'var(--color-muted-foreground)' }}>
            <li>Drishti AI is an experimental assistive tool, not a primary mobility aid.</li>
            <li>It does NOT replace a white cane, guide dog, or traffic awareness.</li>
            <li>It will never claim a road is safe or tell you when to cross.</li>
          </ul>
        </div>
      </section>

      <button type="button" className="btn-primary-royal" onClick={onComplete}>
        <CheckCircle size={26} weight="bold" aria-hidden="true" />
        <span>I Understand — Continue</span>
      </button>
    </section>
  );
}
