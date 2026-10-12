import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { createLecturer } from "../../lib/lecturers";
import { ApiError } from "../../types/common";
import type { AdminUser } from "../../types/users";

type Props = {
  onClose: () => void;
  onCreated: (lecturer: AdminUser) => void;
};

/**
 * Create-only — unlike Subject/StudyMaterial, there's no edit mode here.
 * A lecturer edits their own name/password through Settings/Profile, not
 * through an admin form; this modal's only job is the one thing nothing
 * else can do, actually creating the account.
 */
export default function LecturerFormModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
    {},
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      const res = await createLecturer({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      onCreated(res.data);
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
    <Modal isOpen onClose={onClose} className="max-w-md">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white p-6 dark:bg-gray-dark"
      >
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          Add lecturer
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="lecturer_name">Name</Label>
            <Input
              id="lecturer_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Adaeze Okafor"
              error={Boolean(fieldErrors.name?.[0])}
              hint={fieldErrors.name?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="lecturer_email">Email</Label>
            <Input
              id="lecturer_email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lecturer@example.com"
              error={Boolean(fieldErrors.email?.[0])}
              hint={fieldErrors.email?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="lecturer_password">Password</Label>
            <Input
              id="lecturer_password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(fieldErrors.password?.[0])}
              hint={fieldErrors.password?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="lecturer_password_confirmation">
              Confirm password
            </Label>
            <Input
              id="lecturer_password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
