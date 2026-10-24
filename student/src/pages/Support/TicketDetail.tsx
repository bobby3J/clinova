import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import AppShell from "../../components/AppShell";
import MobileTopBar from "../../components/MobileTopBar";
import { ChevronLeftIcon } from "../../components/icons";
import { getTicket, replyToTicket } from "../../lib/support";
import { ApiError } from "../../types/common";
import type { SupportTicket } from "../../types/support";

const STATUS_LABELS: Record<SupportTicket["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

/**
 * `/support/:id` — the full thread, chat-bubble style. The student's own
 * messages are right-aligned/brand-colored, admin replies left-aligned/
 * gray — is_admin (SupportTicketMessageResource) is what drives that, not
 * a client-side guess based on name.
 */
export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  function load() {
    if (!id) return;
    getTicket(Number(id))
      .then((res) => setTicket(res.data))
      .catch(() => setError("Couldn't load this ticket."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [ticket?.messages.length]);

  async function handleReply(e: FormEvent) {
    e.preventDefault();
    if (!ticket || !reply.trim()) return;
    setSending(true);
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

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="flex min-h-[calc(100vh-4rem)] flex-col px-5 pt-6 pb-4 lg:mx-auto lg:max-w-xl lg:px-0 lg:pt-0">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/support" className="text-gray-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold text-gray-800">
              {ticket?.subject ?? "Ticket"}
            </h1>
            {ticket && (
              <p className="text-xs text-gray-400">{STATUS_LABELS[ticket.status]}</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            <div className="h-16 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ) : error && !ticket ? (
          <p className="text-sm text-error-600">{error}</p>
        ) : (
          ticket && (
            <>
              <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-4">
                {ticket.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.is_admin ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                        message.is_admin
                          ? "bg-white text-gray-700 shadow-theme-sm"
                          : "bg-brand-500 text-white"
                      }`}
                    >
                      {message.body}
                    </div>
                    <p className="mt-1 px-1 text-[11px] text-gray-400">
                      {message.is_admin ? message.author_name : "You"} ·{" "}
                      {new Date(message.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {error && (
                <div className="mb-3 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleReply} className="flex items-end gap-2">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={1}
                  placeholder="Write a reply…"
                  className="max-h-32 flex-1 resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="h-12 shrink-0 rounded-xl bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Send
                </button>
              </form>
            </>
          )
        )}
      </div>
    </AppShell>
  );
}
