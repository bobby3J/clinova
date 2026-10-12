/**
 * Matches GetOverviewMetricsAction::handle()'s return shape exactly
 * (api/app/Domain/Admin/Actions/GetOverviewMetricsAction.php) — all four
 * numbers are already rounded/aggregated server-side over a trailing
 * 7-day window; nothing here needs client-side math.
 */
export interface OverviewMetrics {
  active_students_7d: number;
  study_hours_7d: number;
  avg_session_minutes: number;
  new_signups_7d: number;
}

/**
 * Matches GetStudyActivityOverTimeAction::handle()'s return shape exactly
 * (api/app/Domain/Admin/Actions/GetStudyActivityOverTimeAction.php) — one
 * entry per day in the window, oldest first, zero-filled server-side so
 * there's never a "missing" day to re-derive on this end.
 */
export interface StudyActivityDay {
  date: string;
  minutes: number;
  sessions: number;
}
