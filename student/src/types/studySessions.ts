/**
 * Matches StudySessionResource exactly
 * (api/app/Domain/StudySessions/Http/Resources/StudySessionResource.php).
 * `type` is always "focus" in practice — the backend's SessionType enum
 * has a "break" case, but nothing ever creates a break-type row (break
 * timing in this app is purely client-side, no session record for it).
 */
export interface StudySession {
  id: number;
  sound_id: number | null;
  type: "focus" | "break";
  planned_minutes: number;
  actual_minutes: number;
  completed: boolean;
  started_at: string;
  ended_at: string | null;
}
