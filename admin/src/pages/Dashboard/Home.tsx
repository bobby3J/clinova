import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { getOverviewMetrics, getStudyActivityOverTime } from "../../lib/analytics";
import { getAllAdminUsers } from "../../lib/users";
import { BoltIcon, GroupIcon, ShootingStarIcon, TimeIcon } from "../../icons";
import { ApiError } from "../../types/common";
import type { OverviewMetrics, StudyActivityDay } from "../../types/analytics";
import type { AdminUser } from "../../types/users";

/**
 * ApexCharts is large (~250KB gzipped) and nothing else in this app needs
 * it — lazy-loading means that cost is only ever paid once the charts
 * actually render, not bundled into every page's initial load. There's no
 * route-level code-splitting elsewhere in this app yet; this is scoped to
 * just the two chart components rather than redoing that app-wide.
 */
const TrackDistributionChart = lazy(() => import("./TrackDistributionChart"));
const SignupsTrendChart = lazy(() => import("./SignupsTrendChart"));
const StreakDistributionChart = lazy(
  () => import("./StreakDistributionChart"),
);
const StudyActivityChart = lazy(() => import("./StudyActivityChart"));

type TileConfig = {
  key: keyof OverviewMetrics;
  label: string;
  icon: typeof GroupIcon;
  accent: "brand" | "blue-light" | "warning" | "success";
  format: (value: number) => string;
};

const TILES: TileConfig[] = [
  {
    key: "active_students_7d",
    label: "Active students",
    icon: GroupIcon,
    accent: "brand",
    format: (v) => v.toLocaleString(),
  },
  {
    key: "study_hours_7d",
    label: "Study hours",
    icon: TimeIcon,
    accent: "blue-light",
    format: (v) => `${v.toLocaleString()} hrs`,
  },
  {
    key: "avg_session_minutes",
    label: "Avg. session",
    icon: BoltIcon,
    accent: "warning",
    format: (v) => `${v.toLocaleString()} min`,
  },
  {
    key: "new_signups_7d",
    label: "New signups",
    icon: ShootingStarIcon,
    accent: "success",
    format: (v) => v.toLocaleString(),
  },
];

const ACCENT_CLASSES: Record<TileConfig["accent"], string> = {
  brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  "blue-light":
    "bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  warning:
    "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  success:
    "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
};

export default function Home() {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // Students list powers the two charts below (track split, signup trend)
  // — kept separate from the KPI tiles' load/error state on purpose, so a
  // failure here doesn't take down the tiles above it, and vice versa.
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getOverviewMetrics()
      .then((res) => {
        if (cancelled) return;
        setMetrics(res.data);
        setLastUpdated(new Date());
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load the overview. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // getAllAdminUsers(), not getAdminUsers() — GET /admin/users is paginated
  // now (25/page), and these two charts need the whole student population
  // to compute accurate aggregates, not just whichever page loaded first.
  useEffect(() => {
    let cancelled = false;
    setStudentsLoading(true);
    setStudentsError(null);

    getAllAdminUsers()
      .then((users) => {
        if (!cancelled) setStudents(users);
      })
      .catch((err) => {
        if (!cancelled) {
          setStudentsError(
            err instanceof ApiError ? err.message : "Couldn't load student data.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setStudentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // A dedicated backend aggregate endpoint (GET /admin/analytics/study-
  // activity), not client-side computation like the charts above — this
  // one needs StudySessions rows, which the students fetch above never
  // includes. Its own load/error state for the same reason the students
  // effect is split from the metrics one: one failing shouldn't take
  // down the others.
  const [activity, setActivity] = useState<StudyActivityDay[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    setActivityError(null);

    getStudyActivityOverTime()
      .then((res) => {
        if (!cancelled) setActivity(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setActivityError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load study activity.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const trackCounts = useMemo(() => {
    let nursing = 0;
    let midwifery = 0;
    let unset = 0;
    for (const student of students) {
      if (student.track === "nursing") nursing++;
      else if (student.track === "midwifery") midwifery++;
      else unset++;
    }
    return { nursing, midwifery, unset };
  }, [students]);

  const firstName = user?.name?.split(" ")[0];

  return (
    <>
      <PageMeta
        title="Overview | Clinova Admin"
        description="Clinova admin console overview."
      />

      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            {firstName ? `Welcome back, ${firstName}` : "Overview"}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            How Clinova's been used over the last 7 days.
          </p>
        </div>

        {!loading && !error && (
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-gray-400">
                Updated {lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-error-200 p-5 dark:border-error-500/30">
          <p className="text-sm text-error-600 dark:text-error-400">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TILES.map((tile) => {
            const Icon = tile.icon;
            return (
              <div
                key={tile.key}
                className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${ACCENT_CLASSES[tile.accent]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                  {tile.label}
                </p>
                {loading || !metrics ? (
                  <div className="mt-2 h-8 w-20 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
                    {tile.format(metrics[tile.key])}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {studentsLoading ? (
          <>
            <ChartSkeleton />
            <ChartSkeleton />
            <ChartSkeleton />
          </>
        ) : studentsError ? (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-error-200 p-5 lg:col-span-2 xl:col-span-3 dark:border-error-500/30">
            <p className="text-sm text-error-600 dark:text-error-400">
              {studentsError}
            </p>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Try again
            </button>
          </div>
        ) : (
          <Suspense
            fallback={
              <>
                <ChartSkeleton />
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            }
          >
            <TrackDistributionChart
              nursing={trackCounts.nursing}
              midwifery={trackCounts.midwifery}
              unset={trackCounts.unset}
            />
            <SignupsTrendChart users={students} />
            <StreakDistributionChart users={students} />
          </Suspense>
        )}
      </div>

      <div className="mt-6">
        {activityLoading ? (
          <ChartSkeleton />
        ) : activityError ? (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-error-200 p-5 dark:border-error-500/30">
            <p className="text-sm text-error-600 dark:text-error-400">
              {activityError}
            </p>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Try again
            </button>
          </div>
        ) : (
          <Suspense fallback={<ChartSkeleton />}>
            <StudyActivityChart data={activity} />
          </Suspense>
        )}
      </div>
    </>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-gray-100 dark:bg-white/5" />
      <div className="h-[300px] animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
    </div>
  );
}
