import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";

/**
 * Not a placeholder like its siblings — this needs no new endpoint, it
 * just renders what AuthContext already fetched from GET /user on app
 * load. Doubles as a live check that the auth rewrite actually works:
 * if this page shows real data, the session cookie, the CSRF handshake,
 * and the roles field on the backend are all functioning together.
 */
export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  const fields: Array<[string, string]> = [
    ["Name", user.name],
    ["Email", user.email],
    ["Roles", user.roles.join(", ") || "—"],
    ["Streak", `${user.streak_count} day${user.streak_count === 1 ? "" : "s"}`],
  ];

  return (
    <>
      <PageMeta title="Profile | Clinova Admin" description="Your account." />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Profile
        </h1>
        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {label}
              </dt>
              <dd className="mt-1 text-sm text-gray-800 dark:text-white/90">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
