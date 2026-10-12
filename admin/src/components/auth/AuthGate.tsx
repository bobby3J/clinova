import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { isAdmin, isLecturer } from "../../types/auth";

/**
 * Clinova's backend has three roles: student, admin, and (as of
 * 2026-10-06) lecturer — see api/docs/API_REFERENCE.md. This console is
 * for admin AND lecturer; students never reach past this gate. Which
 * *pages* a lecturer can reach within the console is a second, narrower
 * level of gating — see RequireRole.tsx and AppSidebar.tsx's role-filtered
 * nav — this gate only answers "is this account allowed in here at all."
 */
export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isAdmin(user) && !isLecturer(user)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-gray-800 dark:text-white/90">
          This account doesn't have admin or lecturer access
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Signed in as {user.email}. Contact an administrator if you believe
          this is a mistake.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
