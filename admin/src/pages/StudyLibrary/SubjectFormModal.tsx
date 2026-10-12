import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { createSubject, updateSubject } from "../../lib/studyLibrary";
import { ApiError } from "../../types/common";
import type { Track } from "../../types/common";
import type { Subject } from "../../types/studyLibrary";

type Props = {
  /** Editing an existing subject, or creating a new one. */
  subject: Subject | null;
  onClose: () => void;
  onSaved: (subject: Subject) => void;
};

export default function SubjectFormModal({ subject, onClose, onSaved }: Props) {
  const isEdit = subject !== null;

  const [name, setName] = useState(subject?.name ?? "");
  const [track, setTrack] = useState<Track>(subject?.track ?? "nursing");
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
      const res = isEdit
        ? await updateSubject(subject.id, { name, track })
        : await createSubject({ name, track });
      onSaved(res.data);
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
          {isEdit ? "Edit subject" : "New subject"}
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="subject_name">Name</Label>
            <Input
              id="subject_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fundamentals of Nursing"
              error={Boolean(fieldErrors.name?.[0])}
              hint={fieldErrors.name?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="subject_track">Track</Label>
            <select
              id="subject_track"
              value={track}
              onChange={(e) => setTrack(e.target.value as Track)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            >
              <option value="nursing">Nursing</option>
              <option value="midwifery">Midwifery</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
