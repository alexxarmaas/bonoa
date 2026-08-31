type BonoaLogoProps = {
  className?: string;
  wordmarkClassName?: string;
  iconOnly?: boolean;
  tone?: "dark" | "light";
};

export default function BonoaLogo({
  className = "",
  wordmarkClassName = "",
  iconOnly = false,
  tone = "dark",
}: BonoaLogoProps) {
  const wordmarkColor = tone === "light" ? "#ffffff" : "#0f172a";

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Bonoa">
      <svg viewBox="0 0 48 42" className="h-9 w-10 shrink-0" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="bonoa-wallet-gradient" x1="5" y1="4" x2="42" y2="38" gradientUnits="userSpaceOnUse">
            <stop stopColor="#06B6D4" />
            <stop offset="0.42" stopColor="#1688F8" />
            <stop offset="1" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <path d="M9.2 11.4 34.8 3.7c2.6-.8 4.9.9 5.4 3.4l1 5.1-28.8 6.1-3.2-6.9Z" fill="url(#bonoa-wallet-gradient)" />
        <path d="M5.5 14.4c0-4 3.2-7.2 7.2-7.2h19.8c5.5 0 10 4.5 10 10v15.3c0 4-3.2 7.2-7.2 7.2H12.7c-4 0-7.2-3.2-7.2-7.2V14.4Z" fill="url(#bonoa-wallet-gradient)" />
        <path d="M22.8 15.8h14.4c3 0 5.3 2.4 5.3 5.3v9.4c0 3-2.4 5.3-5.3 5.3H22.8c-3 0-5.3-2.4-5.3-5.3v-9.4c0-3 2.4-5.3 5.3-5.3Z" fill="#fff" />
        <rect x="21.4" y="19.2" width="5.2" height="5.2" rx=".8" fill="#2563EB" />
        <rect x="29.3" y="19.2" width="5.2" height="5.2" rx=".8" fill="#2563EB" />
        <rect x="21.4" y="27.1" width="5.2" height="5.2" rx=".8" fill="#2563EB" />
        <rect x="29.4" y="27.1" width="2.2" height="2.2" rx=".35" fill="#2563EB" />
        <rect x="32.3" y="30" width="2.2" height="2.2" rx=".35" fill="#2563EB" />
        <rect x="32.3" y="27.1" width="2.2" height="2.2" rx=".35" fill="#2563EB" />
        <rect x="29.4" y="30" width="2.2" height="2.2" rx=".35" fill="#2563EB" />
      </svg>
      {!iconOnly ? (
        <span
          className={`text-[1.15rem] font-semibold tracking-[0.17em] ${wordmarkClassName}`}
          style={{ color: wordmarkColor }}
        >
          BONŌA
        </span>
      ) : null}
    </span>
  );
}
