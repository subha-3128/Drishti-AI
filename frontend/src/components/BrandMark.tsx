export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 60C28 38 44 28 60 28C76 28 92 38 104 60C92 82 76 92 60 92C44 92 28 82 16 60Z"
        stroke="var(--color-primary)"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M44 86L55 58H65L76 86"
        stroke="var(--color-tertiary)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="52" r="10" fill="var(--color-tertiary)" />
    </svg>
  );
}
