import { useEffect, useState } from "react";
import { Link } from "react-router";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import { AlertIcon, ChevronLeftIcon } from "../../components/icons";
import { getTickets } from "../../lib/support";
import type { SupportTicket } from "../../types/support";

const STATUS_STYLES: Record<SupportTicket["status"], string> = {
  open: "bg-warning-50 text-warning-500",
  in_progress: "bg-brand-50 text-brand-500",
  resolved: "bg-success-50 text-success-600",
};

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

/**
 * `/support` — the student's own ticket list. New ticket creation lives at
 * `/support/new`; tapping a row goes to `/support/:id` for the thread.
 * Reachable from Profile.tsx's "Help & Support" link.
 */
export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTickets()
      .then((res) => setTickets(res.data))
      .catch(() => setError("Couldn't load your support tickets."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-28 lg:mx-auto lg:max-w-xl lg:px-0 lg:pt-0 lg:pb-0">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/profile" className="text-gray-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 lg:text-2xl">
            Help & Support
          </h1>
        </div>

        <Link
          to="/support/new"
          className="mb-6 flex h-12 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Report an issue
        </Link>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ) : error ? (
          <p className="text-sm text-error-600">{error}</p>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-gray-100 bg-white py-16 text-center">
            <AlertIcon className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">
              No tickets yet — report an issue above and we'll get back to you here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  to={`/support/${ticket.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-theme-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">
                      {ticket.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(ticket.updated_at).toLocaleDateString()}
                      {ticket.category ? ` · ${ticket.category}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[ticket.status]}`}
                  >
                    {STATUS_LABELS[ticket.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
