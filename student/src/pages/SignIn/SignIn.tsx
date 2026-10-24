import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export default function SignIn() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const locationState = location.state as { from?: string; message?: string } | null;

  if (!loading && user) {
    return <Navigate to={locationState?.from ?? "/"} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app-shell flex flex-col justify-center px-6 py-10">
      <div className="mb-10 text-center">
        <img
          src="/images/logo/clinova-mark.svg"
          alt="Clinova"
          width={56}
          height={56}
          className="mx-auto mb-4"
        />
        <h1 className="text-2xl font-semibold text-gray-800">Clinova</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your Nursing & Midwifery Study Companion
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {locationState?.message && !error && (
          <div className="rounded-xl bg-success-50 px-4 py-3 text-sm text-success-600">
            {locationState.message}
          </div>
        )}

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

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
          <Link
            to="/forgot-password"
            className="mt-1.5 block text-right text-xs font-medium text-brand-600"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-brand-600">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
