import { apiGet, apiPatch, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type { StudySession } from "../types/studySessions";

/**
 * GET /study-sessions — only the caller's own sessions, unpaginated
 * (scoped server-side via $request->user()->studySessions(), see
 * StudySessionController::index()). Used to compute "today's progress"
 * client-side — there's no backend aggregate endpoint for that yet.
 */
export function getSessionHistory() {
  return apiGet<ApiListResponse<StudySession>>("/study-sessions");
}

/**
 * POST /study-sessions — starts a focus session. planned_minutes must be
 * 5-180 (backend-validated); sound_id is optional. Always created as
 * type: focus, completed: false, actual_minutes: 0.
 */
export function startSession(plannedMinutes: number, soundId: number | null) {
  return apiPost<ApiResponse<StudySession>>("/study-sessions", {
    planned_minutes: plannedMinutes,
    sound_id: soundId,
  });
}

/**
 * PATCH /study-sessions/{id}/finish — ends a session, either naturally
 * (completed: true, which triggers the server-side streak update) or
 * early (completed: false, still saved as an honest record but no streak
 * change). Ownership-enforced server-side (403 on someone else's session).
 */
export function finishSession(
  id: number,
  actualMinutes: number,
  completed: boolean,
) {
  return apiPatch<ApiResponse<StudySession>>(`/study-sessions/${id}/finish`, {
    actual_minutes: actualMinutes,
    completed,
  });
}
