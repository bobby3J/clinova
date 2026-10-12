import { useEffect, useMemo, useState } from "react";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import { SparkleIcon } from "../../components/icons";
import RecentSessionsList from "../../components/RecentSessionsList";
import { useAuth } from "../../context/AuthContext";
import { getSessionHistory } from "../../lib/studySessions";
import { getSounds } from "../../lib/sounds";
import { getPracticeHistory } from "../../lib/aiPractice";
import type { StudySession } from "../../types/studySessions";
import type { Sound } from "../../types/sounds";
import type { PracticeSet } from "../../types/aiPractice";

const RECENT_LIMIT = 8;

export default function Progress() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [practiceSets, setPracticeSets] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getSessionHistory(),
      getSounds(),
      // Caught independently — AI Practice history failing shouldn't take
      // down the study-session stats this screen's main job is to show.
      getPracticeHistory().catch(() => ({ data: [] })),
    ])
      .then(([sessionsRes, soundsRes, practiceRes]) => {
        if (cancelled) return;
        setSessions(sessionsRes.data);
        setSounds(soundsRes.data);
        setPracticeSets(practiceRes.data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Couldn't load your study history. Check your connection and try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const soundNameById = useMemo(() => {
    const map = new Map<number, string>();
    sounds.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sounds]);

  const stats = useMemo(() => {
    const completed = sessions.filter((s) => s.completed);
    const totalMinutes = completed.reduce((sum, s) => sum + s.actual_minutes, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyMinutes = completed
      .filter((s) => new Date(s.started_at) >= weekAgo)
      .reduce((sum, s) => sum + s.actual_minutes, 0);

    return {
      totalSessions: completed.length,
      totalMinutes,
      weeklyMinutes,
    };
  }, [sessions]);

  // weekly_goal_minutes is a real, existing User field (default 300 =
  // 5h) — nothing in this app lets a student change it yet (that's a
  // Settings follow-up, not built here), but the value itself is real,
  // not fabricated, so showing progress against it is honest.
  const weeklyGoalMinutes = user?.weekly_goal_minutes ?? 300;
  const weeklyPercent = Math.min(
    100,
    Math.round((stats.weeklyMinutes / weeklyGoalMinutes) * 100),
  );

  const recentSessions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, RECENT_LIMIT),
    [sessions],
  );

  const recentPracticeSets = useMemo(
    () =>
      [...practiceSets]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, RECENT_LIMIT),
    [practiceSets],
  );

  function formatHours(minutes: number): string {
    const hours = minutes / 60;
    return hours >= 1 ? `${hours.toFixed(1)}h` : `${minutes}m`;
  }

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-28 lg:grid lg:grid-cols-3 lg:items-start lg:gap-8 lg:px-0 lg:pt-0 lg:pb-0">
        <div className="lg:col-span-2">
          <h1 className="mb-6 text-xl font-semibold text-gray-800 lg:text-2xl">
            Your Progress
          </h1>

          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="h-24 animate-pulse rounded-2xl bg-gray-100" />
              <div className="h-40 animate-pulse rounded-2xl bg-gray-100" />
            </div>
          ) : error ? (
            <p className="text-sm text-error-600">{error}</p>
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
                  <p className="text-2xl font-bold text-gray-800">{stats.totalSessions}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Total Sessions</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
                  <p className="text-2xl font-bold text-gray-800">
                    {formatHours(stats.totalMinutes)}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Total Study Time</p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-sm font-semibold text-gray-800">Weekly Goal</p>
                  <p className="text-xs text-gray-400">
                    {formatHours(stats.weeklyMinutes)} / {formatHours(weeklyGoalMinutes)} ·{" "}
                    {weeklyPercent}%
                  </p>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${weeklyPercent}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6 lg:hidden">
                <RecentSessionsList
                  sessions={recentSessions}
                  soundNameById={soundNameById}
                />
                <RecentPracticeList sets={recentPracticeSets} />
              </div>
            </>
          )}
        </div>

        {!loading && !error && (
          <div className="hidden flex-col gap-6 lg:col-span-1 lg:flex">
            <RecentSessionsList sessions={recentSessions} soundNameById={soundNameById} />
            <RecentPracticeList sets={recentPracticeSets} />
          </div>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}

/**
 * Score only counts questions the student actually answered (has
 * correct_option revealed) — an unanswered question isn't a miss, it's
 * just not attempted yet, so it's excluded from the denominator entirely
 * rather than silently counted as wrong.
 */
function RecentPracticeList({ sets }: { sets: PracticeSet[] }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
      <p className="mb-3 text-sm font-semibold text-gray-800">Recent Practice</p>
      {sets.length === 0 ? (
        <p className="text-xs text-gray-400">No practice sets yet — try AI Practice.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-50">
          {sets.map((set) => {
            const answered = set.questions.filter((q) => q.my_selected_option !== undefined);
            const correct = answered.filter((q) => q.my_answer_correct);
            return (
              <li key={set.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex items-center gap-2">
                  <SparkleIcon className="h-4 w-4 shrink-0 text-gray-300" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {set.topic_name ?? "Practice set"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(set.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-gray-500">
                  {answered.length > 0
                    ? `${correct.length}/${answered.length}`
                    : `${set.questions.length} question${set.questions.length === 1 ? "" : "s"}`}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
