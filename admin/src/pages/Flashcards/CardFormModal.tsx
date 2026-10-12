import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { createCard, updateCard } from "../../lib/flashcards";
import { ApiError } from "../../types/common";
import type { Flashcard } from "../../types/flashcards";

type Props = {
  /** Editing an existing card, or creating a new one in this deck. */
  card: Flashcard | null;
  deckId: number;
  onClose: () => void;
  onSaved: (card: Flashcard) => void;
};

export default function CardFormModal({ card, deckId, onClose, onSaved }: Props) {
  const isEdit = card !== null;

  const [question, setQuestion] = useState(card?.question ?? "");
  const [answer, setAnswer] = useState(card?.answer ?? "");
  const [order, setOrder] = useState(
    card?.order !== undefined ? String(card.order) : "",
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
      const orderValue = order.trim() ? Number(order) : undefined;
      const res = isEdit
        ? await updateCard(card.id, { question, answer, order: orderValue })
        : await createCard({ deck_id: deckId, question, answer, order: orderValue });
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
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white p-6 dark:bg-gray-dark"
      >
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? "Edit card" : "New card"}
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="card_question">Question</Label>
            <textarea
              id="card_question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              placeholder="e.g. What's the normal adult resting heart rate?"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            />
            {fieldErrors.question?.[0] && (
              <p className="mt-1 text-xs text-error-500">
                {fieldErrors.question[0]}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="card_answer">Answer</Label>
            <textarea
              id="card_answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={2}
              placeholder="e.g. 60-100 beats per minute"
              className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
            />
            {fieldErrors.answer?.[0] && (
              <p className="mt-1 text-xs text-error-500">
                {fieldErrors.answer[0]}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="card_order">Order (optional)</Label>
            <Input
              id="card_order"
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
