import { useEffect, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import LecturerFormModal from "./LecturerFormModal";
import {
  getLecturers,
  reactivateLecturer,
  suspendLecturer,
} from "../../lib/lecturers";
import { PlusIcon, UserCircleIcon } from "../../icons";
import { ApiError, type ApiPaginatedResponse } from "../../types/common";
import type { AdminUser } from "../../types/users";

export default function Lecturers() {
  const [lecturers, setLecturers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<
    ApiPaginatedResponse<AdminUser>["meta"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [actingId, setActingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getLecturers(page)
      .then((res) => {
        if (cancelled) return;
        setLecturers(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load lecturers. Check your connection and try again.",
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

  // Unlike Users.tsx, there's no separate full-population fetch backing
  // these tiles — lecturer accounts are admin-created one at a time, not
  // self-registered at scale, so the current page is realistically the
  // whole list almost always. If that stops being true, this needs the
  // same getAllAdminUsers()-style helper Users.tsx already has.
  const suspendedCount = lecturers.filter((l) => l.is_suspended).length;
  const totalCount = meta?.total ?? lecturers.length;

  async function handleToggleSuspend(lecturer: AdminUser) {
    if (
      !lecturer.is_suspended &&
      !window.confirm(
        `Suspend ${lecturer.name}? This signs them out immediately and they won't be able to log back in until reactivated.`,
      )
    ) {
      return;
    }
    setActionError(null);
    setActingId(lecturer.id);
    try {
      const res = lecturer.is_suspended
        ? await reactivateLecturer(lecturer.id)
        : await suspendLecturer(lecturer.id);
      setLecturers((prev) =>
        prev.map((l) => (l.id === lecturer.id ? res.data : l)),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't update this lecturer.",
      );
    } finally {
      setActingId(null);
    }
  }

  function handleCreated(lecturer: AdminUser) {
    setShowCreateModal(false);
    setLecturers((prev) => [lecturer, ...prev]);
    setMeta((prev) => (prev ? { ...prev, total: prev.total + 1 } : prev));
  }

  return (
    <>
      <PageMeta
        title="Lecturers | Clinova Admin"
        description="Manage lecturer accounts."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Lecturers
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Lecturers can manage Study Library content and Flashcards, same
            as admins — they just can't manage students, broadcast
            announcements, or see the activity log/analytics. Suspending
            signs a lecturer out immediately; there's no delete, only
            suspend/reactivate.
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="mr-1.5 h-4 w-4" />
          Add lecturer
        </Button>
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
        <StatTile label="Total lecturers" value={totalCount} />
        <StatTile
          label="Active"
          value={totalCount - suspendedCount}
          tone="success"
        />
        <StatTile label="Suspended" value={suspendedCount} tone="warning" />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
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
      ) : lecturers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <UserCircleIcon className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-700" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No lecturers yet
          </p>
          <p className="text-xs text-gray-400">
            Add one to let them upload study materials, flashcards, and exam
            tips.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <Th>Lecturer</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {lecturers.map((lecturer) => (
                  <tr
                    key={lecturer.id}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 dark:text-white/90">
                        {lecturer.name}
                      </p>
                      <p className="text-xs text-gray-400">{lecturer.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        size="sm"
                        color={lecturer.is_suspended ? "warning" : "success"}
                      >
                        {lecturer.is_suspended ? "Suspended" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(lecturer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={actingId === lecturer.id}
                        onClick={() => handleToggleSuspend(lecturer)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                          lecturer.is_suspended
                            ? "border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                        }`}
                      >
                        {actingId === lecturer.id
                          ? "Saving…"
                          : lecturer.is_suspended
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
                {meta.total} lecturer{meta.total === 1 ? "" : "s"} total
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

      {showCreateModal && (
        <LecturerFormModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-gray-400">
      {children}
    </th>
  );
}
