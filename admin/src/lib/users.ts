import { apiGet, apiPatch } from "./api";
import type { ApiPaginatedResponse, ApiResponse } from "../types/common";
import type { AdminUser } from "../types/users";

/**
 * GET /admin/users?page=&per_page= — students only, paginated server-side
 * (default 25/page, capped at 100). Used directly by the Users page's
 * table. The Dashboard's charts need the *whole* population to compute
 * accurate aggregates, not one page — see getAllAdminUsers() below for
 * that case rather than reaching for this one and only seeing page 1.
 */
export function getAdminUsers(page = 1) {
  return apiGet<ApiPaginatedResponse<AdminUser>>(`/admin/users?page=${page}`);
}

/**
 * Walks every page and concatenates — for the Dashboard's
 * TrackDistributionChart/SignupsTrendChart, which need every student to
 * compute accurate aggregates. Capped at 20 page-fetches (2,000 students
 * at the default per_page) as a runaway-loop guard; if the real student
 * population ever gets that large, those charts need a dedicated backend
 * aggregate endpoint instead of pulling everyone client-side — the same
 * "client-side aggregation only works while the list is small" tradeoff
 * documented in REACT_REENTRY_API_GUIDE.md §4b.
 */
export async function getAllAdminUsers(): Promise<AdminUser[]> {
  const first = await getAdminUsers(1);
  const all = [...first.data];

  const lastPage = Math.min(first.meta.last_page, 20);
  for (let page = 2; page <= lastPage; page++) {
    const next = await getAdminUsers(page);
    all.push(...next.data);
  }

  return all;
}

/** Also revokes every Sanctum token the student holds — kills any session they're in right now. */
export function suspendUser(id: number) {
  return apiPatch<ApiResponse<AdminUser>>(`/admin/users/${id}/suspend`);
}

export function reactivateUser(id: number) {
  return apiPatch<ApiResponse<AdminUser>>(`/admin/users/${id}/reactivate`);
}
