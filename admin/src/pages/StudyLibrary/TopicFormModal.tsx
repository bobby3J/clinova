import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { createTopic, updateTopic } from "../../lib/studyLibrary";
import { ApiError } from "../../types/common";
import type { Topic } from "../../types/studyLibrary";

type Props = {
  subjectId: number;
  subjectName: string;
  /** Editing an existing topic, or creating a new one in this subject. */
  topic: Topic | null;
  onClose: () => void;
  onSaved: (topic: Topic) => void;
};

export default function TopicFormModal({
  subjectId,
  subjectName,
  topic,
  onClose,
  onSaved,
}: Props) {
  const isEdit = topic !== null;

  const [name, setName] = useState(topic?.name ?? "");
  const [order, setOrder] = useState(
    topic?.order !== undefined ? String(topic.order) : "",
  );
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
        ? await updateTopic(topic.id, {
            name,
            order: order.trim() ? Number(order) : undefined,
          })
        : await createTopic({
            subject_id: subjectId,
            name,
            order: order.trim() ? Number(order) : undefined,
          });
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
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? "Edit topic" : "New topic"}
        </h3>
        <p className="mb-5 text-sm text-gray-400">in {subjectName}</p>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="topic_name">Name</Label>
            <Input
              id="topic_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Vital Signs"
              error={Boolean(fieldErrors.name?.[0])}
              hint={fieldErrors.name?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="topic_order">Order (optional)</Label>
            <Input
              id="topic_order"
              type="number"
              min="0"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="Lower numbers show first"
              error={Boolean(fieldErrors.order?.[0])}
              hint={fieldErrors.order?.[0]}
            />
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
