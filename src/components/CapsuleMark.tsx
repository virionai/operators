type CapsuleMarkProps = {
  variant?: "runtime" | "seal" | "small";
};

export function CapsuleMark({ variant = "runtime" }: CapsuleMarkProps) {
  if (variant === "runtime") {
    return (
      <span className="capsule-brand-lockup" aria-hidden="true">
        <img src="/brand/logo-capsules-primary.svg" alt="" />
      </span>
    );
  }

  return (
    <span className={`capsule-mark capsule-mark-${variant}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" role="img">
        <defs>
          <linearGradient id={`capsule-mark-${variant}-gradient`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#7ba7c9" />
            <stop offset="52%" stopColor="#6f7cff" />
            <stop offset="100%" stopColor="#c9a87b" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="32" rx="20" ry="25" fill="none" stroke="currentColor" strokeWidth="2" />
        <ellipse cx="32" cy="32" rx="8" ry="25" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.72" />
        <path d="M12 24h40M12 32h40M12 40h40" stroke="currentColor" strokeWidth="1" opacity="0.5" />
        <path d="M32 7v50" stroke="currentColor" strokeWidth="1" opacity="0.75" />
        <circle className="mark-orbit" cx="32" cy="32" r="28" fill="none" stroke={`url(#capsule-mark-${variant}-gradient)`} strokeWidth="1.2" strokeDasharray="11 10" />
      </svg>
    </span>
  );
}
