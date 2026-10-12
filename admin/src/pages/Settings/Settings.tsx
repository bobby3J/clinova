import { useState } from "react";
import type { FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { useAuth } from "../../context/AuthContext";
import { updatePassword } from "../../lib/settings";
import { ApiError } from "../../types/common";

/**
 * Scoped to the admin's own account on purpose — there's no platform-wide
 * settings concept anywhere in the backend (no feature flags, no global
 * config table; the only thing named "settings" is user_settings, which is
 * a future per-student focus-timer preference, not an admin concern). This
 * is the one thing every admin console genuinely needs and that a real
 * endpoint now backs: changing your own password.
 */
export default function Settings() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
    {},
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await updatePassword({
        current_password: currentPassword,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccessMessage("Password updated.");
      setCurrentPassword("");
      setPassword("");
      setPasswordConfirmation("");
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

  return (
    <>
      <PageMeta title="Settings | Clinova Admin" description="Account settings." />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Settings
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Your own account only — there's no platform-wide configuration in
          Clinova yet.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Account
          </h2>
          <dl className="flex flex-col gap-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Name
              </dt>
              <dd className="mt-0.5 text-sm text-gray-800 dark:text-white/90">
                {user?.name}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Email
              </dt>
              <dd className="mt-0.5 text-sm text-gray-800 dark:text-white/90">
                {user?.email}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Change password
          </h2>

          {formError && (
            <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 rounded-lg bg-success-50 px-4 py-2.5 text-sm text-success-600 dark:bg-success-500/10 dark:text-success-500">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
            <div>
              <Label htmlFor="current_password">Current password</Label>
              <Input
                id="current_password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={Boolean(fieldErrors.current_password?.[0])}
                hint={fieldErrors.current_password?.[0]}
              />
            </div>
            <div>
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={Boolean(fieldErrors.password?.[0])}
                hint={fieldErrors.password?.[0]}
              />
            </div>
            <div>
              <Label htmlFor="new_password_confirmation">
                Confirm new password
              </Label>
              <Input
                id="new_password_confirmation"
                type="password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
              />
            </div>

            <div className="mt-2 flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Update password"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
