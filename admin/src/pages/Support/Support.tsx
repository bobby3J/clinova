import { useEffect, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { getAllTickets } from "../../lib/support";
import { ApiError, type ApiPaginatedResponse } from "../../types/common";
import type { SupportTicket, TicketStatus } from "../../types/support";

type StatusFilter = TicketStatus | "all";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const STATUS_BADGE: Record<TicketStatus, "warning" | "info" | "success"> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
};

/**
 * Every student's tickets, server-side paginated and filterable by
 * status — same shape as Users.tsx's table (filter pills + paginated
 * table + loading/error/empty states), not a new layout pattern. Tapping
 * a row goes to /support/:id for the thread + reply + status control.
 */
export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<ApiPaginatedResponse<SupportTicket>["meta"] | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAllTickets(statusFilter, page)
      .then((res) => {
        if (cancelled) return;
        setTickets(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't load tickets.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [statusFilter, page, reloadToken]);

  function handleFilterChange(next: StatusFilter) {
    setStatusFilter(next);
    setPage(1); // a stale page number from a different filter could be past the new result set's last page
  }

  return (
    <>
      <PageMeta
        title="Support | Clinova Admin"
        description="Student-reported issues and questions."
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Support
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Tickets students have opened. Reply to one and it's sent straight
          to them as a notification.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <FilterPill
          label="All"
          active={statusFilter === "all"}
          onClick={() => handleFilterChange("all")}
        />
        {(["open", "in_progress", "resolved"] as const).map((s) => (
          <FilterPill
            key={s}
            label={STATUS_LABEL[s]}
            active={statusFilter === s}
            onClick={() => handleFilterChange(s)}
          />
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4].map((i) => (
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
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No tickets {statusFilter === "all" ? "yet" : `with status "${STATUS_LABEL[statusFilter]}"`}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  <Th>Subject</Th>
                  <Th>Student</Th>
                  <Th>Category</Th>
                  <Th>Status</Th>
                  <Th>Updated</Th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-gray-50 last:border-0 dark:border-gray-800/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        to={`/support/${ticket.id}`}
                        className="font-medium text-gray-800 hover:text-brand-600 dark:text-white/90 dark:hover:text-brand-400"
                      >
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {ticket.student_name}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {ticket.category ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" color={STATUS_BADGE[ticket.status]}>
                        {STATUS_LABEL[ticket.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {new Date(ticket.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {meta && meta.last_page > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Page {meta.current_page} of {meta.last_page} • {meta.total} ticket
                {meta.total === 1 ? "" : "s"} total
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
