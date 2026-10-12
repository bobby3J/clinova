import { apiGet } from "./api";
import type { ApiResponse } from "../types/common";
import type { OverviewMetrics, StudyActivityDay } from "../types/analytics";

/**
 * GET /admin/analytics/overview — the 7-day KPI numbers shown as tiles on
 * the dashboard. All the aggregation (counting, summing, rounding)
 * happens server-side in GetOverviewMetricsAction; this call just fetches
 * the already-computed result. See src/types/analytics.ts for the shape.
 */
export function getOverviewMetrics() {
  return apiGet<ApiResponse<OverviewMetrics>>("/admin/analytics/overview");
}

/**
 * GET /admin/analytics/study-activity?days= — daily completed-session
 * minutes/counts for the dashboard's activity-over-time chart. Unlike the
 * track/streak/signup charts, this one can't be computed client-side from
 * the admin user list (it needs StudySessions rows, which admins never
 * fetch in bulk), so it's a dedicated backend aggregate endpoint — see
 * REACT_REENTRY_API_GUIDE.md §4b for when that's the right call instead
 * of client-side aggregation.
 */
export function getStudyActivityOverTime(days = 30) {
  return apiGet<ApiResponse<StudyActivityDay[]>>(
    `/admin/analytics/study-activity?days=${days}`,
  );
}
