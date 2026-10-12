import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { isAdmin, isLecturer, type AuthUser } from "../../types/auth";

type Role = "admin" | "lecturer";

const CHECKS: Record<Role, (user: AuthUser | null) => boolean> = {
  admin: isAdmin,
  lecturer: isLecturer,
};

/**
 * A second, narrower gate nested inside AuthGate — AuthGate only answers
 * "is this account allowed in the console at all" (admin or lecturer);
 * this answers "is this account allowed on *this* route." Backend routes
 * already 403 a lecturer hitting an admin-only endpoint (see
 * api/app/Domain/Admin/routes.php) — this exists purely so that a
 * lecturer typing /users into the URL bar lands on a real page instead of
 * a broken fetch-error screen. Redirects to Study Library, a page every
 * role this console admits can actually use.
 */
export default function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();

  const allowed = roles.some((role) => CHECKS[role](user));

  if (!allowed) {
    return <Navigate to="/study-library" replace />;
  }

  return <Outlet />;
}
