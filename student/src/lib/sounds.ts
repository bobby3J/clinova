import { apiGet } from "./api";
import type { ApiListResponse } from "../types/common";
import type { Sound } from "../types/sounds";

/**
 * GET /sounds — the student-facing shape only (source/license/is_active
 * are stripped server-side for non-admins, see types/sounds.ts). Same
 * endpoint the admin console's Sound Library page lists in full; a
 * student only ever sees active sounds (enforced server-side too, not
 * just a frontend filter).
 */
export function getSounds() {
  return apiGet<ApiListResponse<Sound>>("/sounds");
}
