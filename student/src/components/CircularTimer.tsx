type Props = {
  totalSeconds: number;
  remainingSeconds: number;
  label: string;
  size?: number;
  /** "light" = teal ring on a white/sage card (Break screen); "dark" =
   * white ring on a dark photo background (Active Focus Timer screen). */
  variant?: "light" | "dark";
};

function formatTime(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * An SVG progress ring, not a canvas/library one — the whole timer UI is
 * ~15 lines of SVG, not worth a dependency for. Shared between
 * ActiveSession.tsx and BreakScreen.tsx, the two screens that need a
 * countdown ring; `variant` is the only thing that differs between them.
 *
 * The ring drains as time passes (full circle at the start, down to
 * nothing at zero) — computed from remaining/total each render, not a
 * decrementing counter of its own, so it always reflects whatever the
 * caller's own elapsed-time calculation says (see ActiveSession.tsx's
 * comment on why that's Date.now()-based, not setInterval-decrementing).
 */
export default function CircularTimer({
  totalSeconds,
  remainingSeconds,
  label,
  size = 240,
  variant = "dark",
}: Props) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  const trackColor = variant === "dark" ? "rgba(255,255,255,0.25)" : "#c7ece3";
  const ringColor = variant === "dark" ? "#ffffff" : "#0e7c6b";
  const textColor = variant === "dark" ? "text-white" : "text-brand-700";
  const labelColor = variant === "dark" ? "text-white/70" : "text-brand-500";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-semibold tabular-nums ${textColor}`}>
          {formatTime(remainingSeconds)}
        </span>
        <span className={`mt-1 text-sm font-medium ${labelColor}`}>{label}</span>
      </div>
    </div>
  );
}
