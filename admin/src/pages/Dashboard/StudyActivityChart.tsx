import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";
import type { StudyActivityDay } from "../../types/analytics";

type Props = {
  data: StudyActivityDay[];
};

/**
 * Area, not bar like SignupsTrendChart — total study minutes across all
 * students is a much less sparse series than daily signup counts (real
 * usage most days once there's any real student base), so a continuous
 * area reads as the trend it actually is instead of overstating sparse
 * bars the way it would for signups.
 */
export default function StudyActivityChart({ data }: Props) {
  const categories = data.map((d) =>
    new Date(d.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  );
  const minutes = data.map((d) => d.minutes);
  const totalMinutes = minutes.reduce((sum, m) => sum + m, 0);
  const totalSessions = data.reduce((sum, d) => sum + d.sessions, 0);

  const options: ApexOptions = {
    chart: {
      type: "area",
      fontFamily: "Outfit, sans-serif",
      toolbar: { show: false },
    },
    // Same brand-500 hex as the other dashboard charts — ApexCharts
    // config is plain JS, not a className, so it can't read the
    // Tailwind token directly. Keep in sync with index.css by hand.
    colors: ["#0e7c6b"],
    stroke: { curve: "smooth", width: 2 },
    fill: {
      type: "gradient",
      gradient: { opacityFrom: 0.35, opacityTo: 0 },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories,
      labels: {
        rotate: -45,
        style: { fontSize: "10px" },
        formatter: (_value, _timestamp, opts) =>
          opts && opts.i % 4 === 0 ? categories[opts.i] : "",
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { fontSize: "11px" } }, min: 0 },
    grid: { strokeDashArray: 4 },
    tooltip: {
      y: { formatter: (v) => `${v} min` },
    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
          Study activity — last {data.length} days
        </h2>
        <span className="text-xs text-gray-400">
          {totalMinutes.toLocaleString()} min across {totalSessions}{" "}
          session{totalSessions === 1 ? "" : "s"}
        </span>
      </div>
      <Chart
        options={options}
        series={[{ name: "Minutes studied", data: minutes }]}
        type="area"
        height={300}
      />
    </div>
  );
}
