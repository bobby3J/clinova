import type { Track } from "./common";

/**
 * GET /api/user's shape — note this is the one endpoint that does NOT wrap
 * its payload in { data: ... } (it's a raw closure route, not a Resource;
 * see api/docs/API_REFERENCE.md §2). `roles` was added to the backend
 * specifically so this admin console can gate access without guessing —
 * see routes/api.php's comment on that change.
 */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  track: Track | null;
  level: string | null;
  streak_count: number;
  weekly_goal_minutes: number;
  last_active_at: string | null;
  suspended_at: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export const isAdmin = (user: AuthUser | null): boolean =>
  user?.roles.includes("admin") ?? false;

export const isLecturer = (user: AuthUser | null): boolean =>
  user?.roles.includes("lecturer") ?? false;
