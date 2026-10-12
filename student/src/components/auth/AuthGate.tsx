import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { isStudent } from "../../types/auth";

/**
 * Mirrors admin/src/components/auth/AuthGate.tsx's shape, inverted role
 * check — this app is student-only. An admin or lecturer account signing
 * in here (e.g. by mistake) gets the same "not allowed" treatment a
 * student gets trying to reach the admin console.
 */
export default function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isStudent(user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-lg font-semibold text-gray-800">
          This account isn't a student account
        </p>
        <p className="text-sm text-gray-500">
          Signed in as {user.email}. This app is for students only.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
