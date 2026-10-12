import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

type Props = {
  nursing: number;
  midwifery: number;
  unset: number;
};

/**
 * Donut, not pie — matches the rest of the dashboard's rounded-2xl card
 * language better, and ApexCharts' donut legend reads cleaner with 2-3
 * slices than a bare pie does.
 */
export default function TrackDistributionChart({
  nursing,
  midwifery,
  unset,
}: Props) {
  const hasUnset = unset > 0;
  const labels = hasUnset
    ? ["Nursing", "Midwifery", "No track set"]
    : ["Nursing", "Midwifery"];
  const series = hasUnset ? [nursing, midwifery, unset] : [nursing, midwifery];
  // ApexCharts' `colors` option is plain JS config, not a className — it
  // can't read Tailwind's CSS variables, so these are the same brand
  // tokens' raw hex values, copied from index.css by hand:
  // brand-500 (#0e7c6b), blue-light-500 (#0ba5ec), gray-300 (#d0d5dd).
  // If those tokens ever change, update these three lines too.
  const colors = hasUnset
    ? ["#0e7c6b", "#0ba5ec", "#d0d5dd"]
    : ["#0e7c6b", "#0ba5ec"];

  const options: ApexOptions = {
    chart: { type: "donut", fontFamily: "Outfit, sans-serif" },
    labels,
    colors,
    legend: { position: "bottom", fontSize: "13px" },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Students",
              fontSize: "13px",
              color: "#667085",
            },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => `${v} student${v === 1 ? "" : "s"}` } },
  };

  const total = nursing + midwifery + unset;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
        Students by track
      </h2>
      {total === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No students yet
        </div>
      ) : (
        <Chart options={options} series={series} type="donut" height={300} />
      )}
    </div>
  );
}
