import type { Track } from "./common";

/**
 * GET /api/user's shape — note this is the one endpoint that does NOT wrap
 * its payload in { data: ... } (it's a raw closure route, not a Resource;
 * see api/docs/API_REFERENCE.md §2). Identical to admin's AuthUser type —
 * the backend returns the same raw User model regardless of the caller's
 * role, so there's nothing student-specific to add here.
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

export const isStudent = (user: AuthUser | null): boolean =>
  user?.roles.includes("student") ?? false;
