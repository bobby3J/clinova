import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { getSessionHistory } from "../../lib/studySessions";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import {
  BookIcon,
  CardsIcon,
  HeadphonesIcon,
  SparkleIcon,
} from "../../components/icons";
import type { StudySession } from "../../types/studySessions";

/**
 * There's no backend "daily session goal" concept — weekly_goal_minutes
 * exists on User but nothing writes to it yet, and there's no daily
 * session-count field at all. The mockup's "X/Y" progress format is kept
 * for visual fidelity, with Y as this disclosed local constant rather
 * than presented as something the backend actually tracks. Revisit once
 * a real goal-setting feature exists (see PROJECT docs' Settings gap).
 */
const DAILY_SESSION_GOAL = 4;

export default function Home() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSessionHistory()
      .then((res) => {
        if (!cancelled) setSessions(res.data);
      })
      .catch(() => {
        // Today's Progress just shows 0 — not worth a full error state on
        // the home screen for a non-critical stat.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const todaysCompletedCount = useMemo(() => {
    const today = new Date().toDateString();
    return sessions.filter(
      (s) => s.completed && new Date(s.started_at).toDateString() === today,
    ).length;
  }, [sessions]);

  const firstName = user?.name?.split(" ")[0] ?? "Future Nurse";

  // The browser's own local time, not UTC/the server's — correct for a
  // student in any timezone (Ghana included, GMT/UTC+0 year-round, no
  // DST) with no per-country logic needed. Was hardcoded to "Good
  // morning" regardless of actual time until this was flagged.
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      {/* Mobile: single stacked column, pb-24 clears the fixed BottomNav.
          Desktop (lg:): a real two-column dashboard — main content +
          Today's Progress as a side rail, not just a wider single column. */}
      <div className="px-5 pt-6 pb-24 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:px-0 lg:pt-0 lg:pb-0">
        <div className="lg:col-span-2">
          {/* Desktop only — mobile gets its logo from MobileTopBar above,
              showing it twice stacked would be redundant there. */}
          <div className="mb-6 hidden items-center justify-between lg:flex">
            <div className="flex items-center gap-2">
              <img src="/images/logo/clinova-mark.svg" alt="Clinova" className="h-8 w-8" />
              <div>
                <p className="text-sm font-bold text-gray-800">Clinova</p>
                <p className="text-[11px] text-gray-400">
                  Nursing & Midwifery Study Companion
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-semibold text-gray-800 lg:text-2xl">
              {greeting}, {firstName} 👋
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Ready to make progress today?
            </p>
          </div>

          <Link
            to="/study-with-me"
            className="mb-6 block rounded-3xl bg-linear-to-br from-brand-700 to-brand-900 p-6 text-white shadow-theme-md lg:flex lg:items-center lg:justify-between lg:p-8"
          >
            <div>
              <p className="text-lg font-bold lg:text-xl">Study With Me</p>
              <p className="mt-1 text-sm text-brand-100">Focus. Learn. Grow.</p>
            </div>
            <HeadphonesIcon className="mt-4 h-8 w-8 text-brand-200 lg:mt-0 lg:h-10 lg:w-10" />
          </Link>

          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <HomeTile
              icon={BookIcon}
              label="Study Library"
              desc="Notes, videos & useful info"
              to="/study-library"
            />
            <HomeTile
              icon={SparkleIcon}
              label="AI Practice"
              desc="Generate questions & test knowledge"
              to="/ai-practice"
            />
            <HomeTile
              icon={HeadphonesIcon}
              label="Study With Me"
              desc="Focus timers & ambient sounds"
              to="/study-with-me"
              active
            />
            <HomeTile
              icon={CardsIcon}
              label="Flashcards"
              desc="Review key concepts"
              to="/flashcards"
            />
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
            <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">
              Today's Progress
            </p>
            <p className="mt-1 text-3xl font-bold text-brand-600">
              {loading ? "…" : `${todaysCompletedCount}/${DAILY_SESSION_GOAL}`}
            </p>
            <p className="mt-0.5 text-sm text-gray-500">
              {todaysCompletedCount > 0 ? "You're doing great!" : "Start your first session today."}
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </AppShell>
  );
}

function HomeTile({
  icon: Icon,
  label,
  desc,
  to,
  active,
  disabled,
}: {
  icon: typeof BookIcon;
  label: string;
  desc: string;
  to?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const content = (
    <>
      <span
        className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${
          active ? "bg-white/20 text-white" : "bg-brand-50 text-brand-500"
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <p className={`text-sm font-semibold ${active ? "text-white" : "text-gray-800"}`}>
        {label}
      </p>
      <p className={`mt-0.5 text-[11px] ${active ? "text-brand-100" : "text-gray-400"}`}>
        {desc}
      </p>
      {disabled && (
        <span className="mt-1.5 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
          Coming soon
        </span>
      )}
    </>
  );

  const className = `rounded-2xl p-4 text-left shadow-theme-sm ${
    active ? "bg-brand-500" : "bg-white border border-gray-100"
  } ${disabled ? "opacity-90" : ""}`;

  if (disabled || !to) {
    return (
      <div className={className} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  );
}
