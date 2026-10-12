import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { createDeck, updateDeck } from "../../lib/flashcards";
import { ApiError } from "../../types/common";
import type { FlashcardDeck } from "../../types/flashcards";

type Props = {
  /** Editing an existing deck, or creating a new one in this topic. */
  deck: FlashcardDeck | null;
  topicId: number;
  topicName: string;
  onClose: () => void;
  onSaved: (deck: FlashcardDeck) => void;
};

export default function DeckFormModal({
  deck,
  topicId,
  topicName,
  onClose,
  onSaved,
}: Props) {
  const isEdit = deck !== null;

  const [title, setTitle] = useState(deck?.title ?? "");
  const [description, setDescription] = useState(deck?.description ?? "");
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
        ? await updateDeck(deck.id, { title, description: description || null })
        : await createDeck({ topic_id: topicId, title, description: description || null });
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
          {isEdit ? "Edit deck" : "New deck"}
        </h3>
        <p className="mb-5 text-sm text-gray-400">in {topicName}</p>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="deck_title">Title</Label>
            <Input
              id="deck_title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Vital Signs Quick Review"
              error={Boolean(fieldErrors.title?.[0])}
              hint={fieldErrors.title?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="deck_description">Description (optional)</Label>
            <textarea
              id="deck_description"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What this deck covers…"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            />
            {fieldErrors.description?.[0] && (
              <p className="mt-1 text-xs text-error-500">
                {fieldErrors.description[0]}
              </p>
            )}
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
