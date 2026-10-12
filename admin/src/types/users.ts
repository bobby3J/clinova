import type { Track } from "./common";

/**
 * Matches AdminUserResource exactly
 * (api/app/Domain/Admin/Http/Resources/AdminUserResource.php) — the
 * admin-management view of a user, not a student-facing profile shape.
 */
export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  track: Track | null;
  level: string | null;
  streak_count: number;
  is_suspended: boolean;
  created_at: string;
}
