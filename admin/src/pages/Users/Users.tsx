import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import {
  getAdminUsers,
  getAllAdminUsers,
  reactivateUser,
  suspendUser,
} from "../../lib/users";
import { GroupIcon } from "../../icons";
import { ApiError, type ApiPaginatedResponse, type Track } from "../../types/common";
import type { AdminUser } from "../../types/users";

type StatusFilter = "all" | "active" | "suspended";
type TrackFilter = Track | "all";

const TRACK_LABEL: Record<Track, string> = {
  nursing: "Nursing",
  midwifery: "Midwifery",
};

export default function Users() {
  // The rows the table actually renders — one page at a time, straight
  // from GET /admin/users?page=. Keeping the table paginated is what
  // avoids ever mounting thousands of <tr>s into the DOM at once.
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ApiPaginatedResponse<AdminUser>["meta"] | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  // The full student population, fetched separately via getAllAdminUsers().
  // This is *only* for the roll-up tiles above the table (total/active/
  // suspended counts) — those are cheap arithmetic over already-fetched
  // JSON, which is a different cost than rendering thousands of rows, so
  // pulling everyone for this doesn't undo the point of paginating the
  // table. Same justification as Dashboard/Home.tsx's charts.
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);

  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAdminUsers(page)
      .then((res) => {
        if (cancelled) return;
        setUsers(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load students. Check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  // Deliberately separate from the table's load/error state above — if
  // this call fails, the tiles just won't update; it shouldn't block the
  // table (which already has its own error/retry UI) from showing the
  // page that did load successfully.
  useEffect(() => {
    let cancelled = false;

    getAllAdminUsers()
      .then((res) => {
        if (!cancelled) setAllUsers(res);
      })
      .catch(() => {
        // Silently ignored on purpose — see comment above.
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  // Filters only ever run against `users` — the current page's 25 (or
  // fewer) rows — not the full population. That's an accepted tradeoff
  // of paginating server-side: a search for a student on page 3 while
  // viewing page 1 won't find them. There's no "search across all
  // students" backend endpoint (yet) to back a smarter UI here, so the
  // note below the search box exists to make that limitation visible
  // instead of silently confusing — see REACT_REENTRY_API_GUIDE.md §4b.
  const visibleUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (trackFilter !== "all" && user.track !== trackFilter) return false;
      if (statusFilter === "active" && user.is_suspended) return false;
      if (statusFilter === "suspended" && !user.is_suspended) return false;
      if (
        query &&
        !user.name.toLowerCase().includes(query) &&
        !user.email.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [users, trackFilter, statusFilter, search]);

  const isFiltering =
    trackFilter !== "all" || statusFilter !== "all" || search.trim() !== "";

  const totalCount = meta?.total ?? allUsers.length;
  const suspendedCount = allUsers.filter((u) => u.is_suspended).length;

  async function handleToggleSuspend(user: AdminUser) {
    if (
      !user.is_suspended &&
      !window.confirm(
        `Suspend ${user.name}? This signs them out immediately and they won't be able to log back in until reactivated.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setActingId(user.id);
    try {
      const res = user.is_suspended
        ? await reactivateUser(user.id)
        : await suspendUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
      setAllUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't update this student.",
      );
    } finally {
      setActingId(null);
    }
  }

  return (
    <>
      <PageMeta
        title="Users | Clinova Admin"
        description="Manage student accounts."
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Users
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Students only — admin accounts aren't managed here. Suspending
          signs a student out immediately; there's no delete, only
          suspend/reactivate.
        </p>
      </div>

      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {actionError}
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Total students" value={totalCount} />
        <StatTile
          label="Active"
          value={totalCount - suspendedCount}
          tone="success"
        />
        <StatTile label="Suspended" value={suspendedCount} tone="warning" />
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="All tracks"
            active={trackFilter === "all"}
            onClick={() => setTrackFilter("all")}
          />
          {(["nursing", "midwifery"] as const).map((t) => (
            <FilterPill
              key={t}
              label={TRACK_LABEL[t]}
              active={trackFilter === t}
              onClick={() => setTrackFilter(t)}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <FilterPill
            label="Active"
            active={statusFilter === "active"}
            onClick={() =>
              setStatusFilter((prev) => (prev === "active" ? "all" : "active"))
            }
          />
          <FilterPill
            label="Suspended"
            active={statusFilter === "suspended"}
            onClick={() =>
              setStatusFilter((prev) =>
                prev === "suspended" ? "all" : "suspended",
              )
            }
          />
        </div>
        <div className="flex flex-col sm:items-end">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 sm:w-64"
          />
          {isFiltering && meta && meta.last_page > 1 && (
            <p className="mt-1 text-xs text-gray-400">
              Filtering this page only — browse other pages to find students
              elsewhere in the list.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-error-200 p-5 dark:border-error-500/30">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Try again
          </button>
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <GroupIcon className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-700" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {totalCount === 0
              ? "No students yet"
              : "No students on this page match your filters"}
          </p>
          <p className="text-xs text-gray-400">
            {totalCount === 0
              ? "Students show up here once they register."
              : "Try a different track, status, or search term — or check another page."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <Th>Student</Th>
                  <Th>Track</Th>
                  <Th>Level</Th>
                  <Th>Streak</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-400">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.track ? TRACK_LABEL[user.track] : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.level ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {user.streak_count} day{user.streak_count === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        size="sm"
                        color={user.is_suspended ? "warning" : "success"}
                      >
                        {user.is_suspended ? "Suspended" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={actingId === user.id}
                        onClick={() => handleToggleSuspend(user)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          user.is_suspended
                            ? "border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                        }`}
                      >
                        {actingId === user.id
                          ? "Saving…"
                          : user.is_suspended
                            ? "Reactivate"
                            : "Suspend"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {meta.current_page} of {meta.last_page} •{" "}
                {meta.total} student{meta.total === 1 ? "" : "s"} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function StatTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
}) {
  const toneClasses =
    tone === "success"
      ? "text-success-600 dark:text-success-500"
      : tone === "warning"
        ? "text-warning-600 dark:text-orange-400"
        : "text-gray-800 dark:text-white/90";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold ${toneClasses}`}>{value}</p>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
      {children}
    </th>
  );
}
