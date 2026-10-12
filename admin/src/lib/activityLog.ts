import { apiGet } from "./api";
import type { ApiPaginatedResponse } from "../types/common";
import type { AdminActivityLog } from "../types/activityLog";

/**
 * GET /admin/activity-log?page=&per_page= — every logged admin action,
 * newest first. Paginated server-side (default 20/page, capped at 100) —
 * this is the one list in the app with genuinely unbounded growth, so it
 * was the first one paginated. See ActivityLogController::index()'s
 * comment on the backend for the full reasoning.
 */
export function getActivityLog(page = 1) {
  return apiGet<ApiPaginatedResponse<AdminActivityLog>>(
    `/admin/activity-log?page=${page}`,
  );
}
