import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import { getTicket, replyToTicket, updateTicketStatus } from "../../lib/support";
import { ApiError } from "../../types/common";
import type { SupportTicket, TicketStatus } from "../../types/support";

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
 * `/support/:id` — the admin side of the same thread student/TicketDetail.tsx
 * renders, plus the one thing only an admin can do here: change status.
 * Chat-bubble layout, admin's own messages right-aligned/brand-colored —
 * mirrored (not identical) to the student view, where the *student's*
 * messages are the ones right-aligned. Same is_admin field drives both.
 */
export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  function load() {
    if (!id) return;
    getTicket(Number(id))
      .then((res) => setTicket(res.data))
      .catch(() => setError("Couldn't load this ticket."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!ticket || !reply.trim()) return;
    setSending(true);
    setError(null);
    try {
      await replyToTicket(ticket.id, reply);
      setReply("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your reply.");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(status: TicketStatus) {
    if (!ticket || status === ticket.status) return;
    setUpdatingStatus(true);
    try {
      const res = await updateTicketStatus(ticket.id, status);
      setTicket(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update the status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <>
      <PageMeta title="Support Ticket | Clinova Admin" description="" />

      <Link
        to="/support"
        className="mb-4 inline-block text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        ← All tickets
      </Link>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5" />
      ) : !ticket ? (
        <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {ticket.subject}
                </h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {ticket.student_name}
                  {ticket.category ? ` · ${ticket.category}` : ""}
                </p>
              </div>
              <Badge color={STATUS_BADGE[ticket.status]}>
                {STATUS_LABEL[ticket.status]}
              </Badge>
            </div>

            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
              {ticket.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.is_admin ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                      message.is_admin
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-gray-300"
                    }`}
                  >
                    {message.body}
                  </div>
                  <p className="mt-1 px-1 text-[11px] text-gray-400">
                    {message.author_name} · {new Date(message.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {error && (
              <div className="mb-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
                {error}
              </div>
            )}

            <form onSubmit={handleReply} className="flex items-end gap-2">
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={3}
                placeholder="Write a reply — the student is notified as soon as you send this."
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-white/5 dark:text-white/90"
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="h-12 shrink-0 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Send
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
              Status
            </p>
            <div className="flex flex-col gap-2">
              {(["open", "in_progress", "resolved"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusChange(status)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    ticket.status === status
                      ? "border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                  }`}
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
