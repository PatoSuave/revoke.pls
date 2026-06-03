const lifelinePath = "M10 22 L16 22 L19 14 L23 28 L26 22 L30 22";

export function PulseMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      className={`pulse-mark ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="pulseMarkFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--pulse-cyan))" />
          <stop offset="50%" stopColor="rgb(var(--pulse-purple))" />
          <stop offset="100%" stopColor="rgb(var(--pulse-pink))" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="36"
        height="36"
        rx="10"
        className="pulse-mark-frame"
        fill="url(#pulseMarkFill)"
      />
      <path
        d={lifelinePath}
        fill="none"
        stroke="rgb(var(--pulse-mark-stroke))"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={lifelinePath}
        className="pulse-mark-lifeline"
        fill="none"
        pathLength="100"
        stroke="rgb(var(--pulse-cyan))"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
