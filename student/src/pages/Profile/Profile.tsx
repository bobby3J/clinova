import { Link, useNavigate } from "react-router";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import { useAuth } from "../../context/AuthContext";

/**
 * No new endpoint needed — just renders what AuthContext already fetched
 * from GET /user on app load, same reasoning as admin's Profile page.
 */
export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const fields: Array<[string, string]> = [
    ["Name", user.name],
    ["Email", user.email],
    ["Track", user.track ?? "—"],
    ["Level", user.level ?? "—"],
    ["Streak", `${user.streak_count} day${user.streak_count === 1 ? "" : "s"}`],
  ];

  async function handleLogout() {
    await logout();
    navigate("/signin", { replace: true });
  }

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-28 lg:px-0 lg:pt-0 lg:pb-0">
        <h1 className="mb-6 text-xl font-semibold text-gray-800 lg:text-2xl">
          Profile
        </h1>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm lg:max-w-md">
          <dl className="grid grid-cols-2 gap-4">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] font-medium tracking-wide text-gray-400 uppercase">
                  {label}
                </dt>
                <dd className="mt-1 text-sm font-medium text-gray-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-6 flex flex-col gap-3 lg:max-w-md lg:flex-row">
          <Link
            to="/settings"
            className="flex h-12 items-center justify-center rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 lg:flex-1"
          >
            Session Settings
          </Link>
          <Link
            to="/support"
            className="flex h-12 items-center justify-center rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 lg:flex-1"
          >
            Help & Support
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-50 lg:flex-1"
          >
            Log out
          </button>
        </div>
      </div>

      <BottomNav />
    </AppShell>
  );
}
