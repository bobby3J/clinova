import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import AppShell from "../../components/AppShell";
import MobileTopBar from "../../components/MobileTopBar";
import { ChevronLeftIcon } from "../../components/icons";
import { createTicket } from "../../lib/support";
import { ApiError } from "../../types/common";

/**
 * A fixed category list is a frontend convenience only — the backend
 * (CreateSupportTicketRequest) accepts any string here, see that Request's
 * own comment. Keeping the choice simple for the student matters more
 * than enforcing a closed taxonomy server-side for a first pass.
 */
const CATEGORIES = [
  { value: "bug", label: "Something's broken" },
  { value: "question", label: "I have a question" },
  { value: "feedback", label: "Feedback / suggestion" },
  { value: "other", label: "Other" },
];

export default function NewTicket() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await createTicket(subject, category, message);
      navigate(`/support/${res.data.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit your report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-10 lg:mx-auto lg:max-w-xl lg:px-0 lg:pt-0">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/support" className="text-gray-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 lg:text-2xl">
            Report an issue
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="A short summary"
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-gray-700">Category</p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`rounded-xl border p-3 text-left text-xs font-medium transition-colors ${
                    category === c.value
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-gray-100 bg-white text-gray-600"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-gray-700">
              Details
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="What happened? The more detail the better."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !subject.trim() || !message.trim()}
            className="mt-2 h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
