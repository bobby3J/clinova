import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import AppShell from "../../components/AppShell";
import CircularTimer from "../../components/CircularTimer";
import {
  AppleIcon,
  BreatheIcon,
  DropletIcon,
  MugIcon,
  StretchIcon,
} from "../../components/icons";

/**
 * Purely client-side — confirmed the backend's SessionType::Break enum
 * case exists but nothing ever creates a break-type session row; there's
 * no endpoint to call for a break. Fixed 10-minute default, matching the
 * mockup, not configurable yet (that's Session Settings, out of scope).
 */
const BREAK_SECONDS = 10 * 60;

const TIPS = [
  { icon: DropletIcon, label: "Hydrate" },
  { icon: StretchIcon, label: "Stretch" },
  { icon: AppleIcon, label: "Snack" },
  { icon: BreatheIcon, label: "Breathe" },
];

export default function BreakScreen() {
  const navigate = useNavigate();
  const [remainingSeconds, setRemainingSeconds] = useState(BREAK_SECONDS);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      setRemainingSeconds(Math.max(0, BREAK_SECONDS - elapsed));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (remainingSeconds === 0) {
      navigate("/", { replace: true });
    }
  }, [remainingSeconds, navigate]);

  return (
    <AppShell background="bg-brand-50">
      <div className="px-5 pt-10 pb-10 lg:mx-auto lg:max-w-xl lg:px-0">
      <div className="mb-6 text-center">
        <MugIcon className="mx-auto mb-2 h-7 w-7 text-brand-500" />
        <h1 className="text-xl font-semibold text-gray-800">Take a Break</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Your mind works better when you rest
        </p>
      </div>

      <div className="mb-8 flex justify-center">
        <CircularTimer
          totalSeconds={BREAK_SECONDS}
          remainingSeconds={remainingSeconds}
          label="Break Time"
          variant="light"
        />
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2">
        {TIPS.map((tip) => {
          const Icon = tip.icon;
          return (
            <div
              key={tip.label}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-3 shadow-theme-sm"
            >
              <Icon className="h-5 w-5 text-brand-500" />
              <span className="text-[11px] font-medium text-gray-600">{tip.label}</span>
            </div>
          );
        })}
      </div>

      <div className="mb-8 rounded-2xl bg-white p-4 text-center shadow-theme-sm">
        <p className="text-sm text-gray-600">
          "Rest is part of the process, not a reward."
        </p>
      </div>

      <button
        type="button"
        onClick={() => navigate("/", { replace: true })}
        className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Back to Study
      </button>
      </div>
    </AppShell>
  );
}
