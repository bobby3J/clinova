import { useMemo } from "react";
import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { AdminUser } from "../../types/users";

type Props = {
  users: AdminUser[];
  days?: number;
};

/**
 * Bar, not line/area — these are discrete daily counts (often 0, sometimes
 * 1-2) over a 30-day window, computed client-side from created_at on the
 * already-fetched admin user list (no new endpoint). A line chart makes
 * sparse daily counts look like a continuous trend that isn't really
 * there; bars are honest about each day being its own data point.
 */
export default function SignupsTrendChart({ users, days = 30 }: Props) {
  const { categories, counts } = useMemo(() => {
    // Every day in the window is pre-seeded at 0 *before* counting real
    // signups into it — otherwise a day with zero signups would just be
    // missing from the map entirely, and the chart would silently skip
    // it instead of showing a true zero bar.
    const buckets = new Map<string, number>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }

    for (const user of users) {
      const key = user.created_at.slice(0, 10);
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + 1);
      }
    }

    const entries = Array.from(buckets.entries());
    return {
      categories: entries.map(([date]) =>
        new Date(date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      ),
      counts: entries.map(([, count]) => count),
    };
  }, [users, days]);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: { columnWidth: "55%", borderRadius: 2 },
    },
    // Same brand-500 hex as TrackDistributionChart — ApexCharts options
    // are plain JS, not a className, so the Tailwind token can't be
    // referenced directly here. Keep these in sync with index.css by hand.
    colors: ["#0e7c6b"],
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        rotate: -45,
        style: { fontSize: "10px" },
        formatter: (_value, _timestamp, opts) =>
          // Only label every few bars — 30 daily labels at once is unreadable.
          opts && opts.i % 4 === 0 ? categories[opts.i] : "",
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, min: 0 },
    grid: { strokeDashArray: 4 },
    tooltip: {
      y: { formatter: (v) => `${v} signup${v === 1 ? "" : "s"}` },
    },
  };

  const total = counts.reduce((sum, n) => sum + n, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Signups — last {days} days
        </h2>
        <span className="text-xs text-gray-400">{total} total</span>
      </div>
      <Chart options={options} series={[{ name: "Signups", data: counts }]} type="bar" height={300} />
    </div>
  );
}
