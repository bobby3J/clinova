import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../types/common";

export default function SignUp() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await register(name, email, password, passwordConfirmation);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setFieldErrors(err.errors);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
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
        <h1 className="text-2xl font-semibold text-gray-800">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your Nursing & Midwifery Study Companion
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {formError && (
          <div className="rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600">
            {formError}
          </div>
        )}

        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20"
          />
          {fieldError("name") && (
            <p className="mt-1 text-xs text-error-500">{fieldError("name")}</p>
          )}
        </div>

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
          {fieldError("email") && (
            <p className="mt-1 text-xs text-error-500">{fieldError("email")}</p>
          )}
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
          {fieldError("password") && (
            <p className="mt-1 text-xs text-error-500">{fieldError("password")}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password_confirmation"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Confirm password
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
          disabled={submitting}
          className="mt-2 h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-brand-600">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
