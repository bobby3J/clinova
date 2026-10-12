import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AdminUser } from "../../types/users";

type Props = {
  users: AdminUser[];
};

/**
 * Bucket edges chosen to read as engagement stages, not even intervals:
 * 0 = never built a streak at all; 1-2 = just started, most likely to
 * drop off; 3-6 = building the habit; 7-29 = a consistent weekly+
 * learner; 30+ = highly engaged. Plain quartiles wouldn't carry that
 * meaning — these boundaries are a judgment call about what's
 * informative to an admin, not a derived statistic.
 */
const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0 days", min: 0, max: 0 },
  { label: "1–2 days", min: 1, max: 2 },
  { label: "3–6 days", min: 3, max: 6 },
  { label: "7–29 days", min: 7, max: 29 },
  { label: "30+ days", min: 30, max: Infinity },
];

/**
 * Same client-side-aggregation pattern as TrackDistributionChart: no new
 * backend endpoint, computed from the same already-fetched student list
 * the signups chart uses. See REACT_REENTRY_API_GUIDE.md §4b for why
 * that's fine at this app's current scale and what the line is where it
 * stops being fine.
 */
export default function StreakDistributionChart({ users }: Props) {
  const counts = useMemo(() => {
    const result = BUCKETS.map(() => 0);
    for (const user of users) {
      const streak = user.streak_count;
      const bucketIndex = BUCKETS.findIndex(
        (b) => streak >= b.min && streak <= b.max,
      );
      if (bucketIndex !== -1) result[bucketIndex]++;
    }
    return result;
  }, [users]);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { columnWidth: "55%", borderRadius: 2 },
    },
    // Same brand-500 hex as the other dashboard charts — kept in sync
    // with index.css by hand since ApexCharts config can't read CSS vars.
    colors: ["#0ba5ec"],
    dataLabels: { enabled: false },
    xaxis: {
      categories: BUCKETS.map((b) => b.label),
      labels: { style: { fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, min: 0 },
    grid: { strokeDashArray: 4 },
    tooltip: {
      y: { formatter: (v) => `${v} student${v === 1 ? "" : "s"}` },
    },
  };

  const total = users.length;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
        Streak distribution
      </h2>
      {total === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No students yet
        </div>
      ) : (
        <Chart
          options={options}
          series={[{ name: "Students", data: counts }]}
          type="bar"
          height={300}
        />
      )}
    </div>
  );
}
