import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { resetPassword } from "../../lib/auth";
import { ApiError } from "../../types/common";

/**
 * `/password-reset/:token` — matches exactly the path
 * AppServiceProvider::boot()'s ResetPassword::createUrlUsing() builds
 * (`/password-reset/$token?email=...`). `token` comes from the route
 * param, `email` from the query string the backend appends — both are
 * opaque values this page just forwards to POST /reset-password, never
 * validates itself.
 */
export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, email, password, passwordConfirmation);
      navigate("/signin", {
        replace: true,
        state: { message: "Password reset — sign in with your new password." },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token || !email) {
    return (
      <div className="app-shell flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <p className="text-sm font-medium text-gray-700">
          This reset link looks incomplete.
        </p>
        <Link to="/forgot-password" className="text-sm font-medium text-brand-600">
          Request a new one
        </Link>
      </div>
    );
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
        <h1 className="text-2xl font-semibold text-gray-800">Set a new password</h1>
        <p className="mt-1 text-sm text-gray-500">for {email}</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <label
            htmlFor="password_confirmation"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Confirm new password
          </label>
          <input
            id="password_confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
            placeholder="••••••••"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !password || !passwordConfirmation}
          className="mt-2 h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Resetting…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}
