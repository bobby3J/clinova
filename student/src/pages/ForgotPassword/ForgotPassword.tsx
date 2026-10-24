import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { forgotPassword } from "../../lib/auth";
import { ApiError } from "../../types/common";

/**
 * `/forgot-password` — email in, one neutral confirmation message out.
 * Deliberately doesn't say whether that email actually has an account
 * (see forgotPassword()'s own docblock) — the success state below shows
 * regardless of whether the backend found a matching user.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <img
          src="/images/logo/clinova-mark.svg"
          alt="Clinova"
          width={56}
          height={56}
          className="mx-auto mb-4"
        />
        <h1 className="text-2xl font-semibold text-gray-800">Reset your password</h1>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we'll send you a link to reset it.
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-600">
            If an account exists for {email}, a reset link is on its way. Check
            your inbox (and spam folder).
          </div>
          <Link to="/signin" className="text-sm font-medium text-brand-600">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="mt-2 h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send reset link"}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link to="/signin" className="font-medium text-brand-600">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
