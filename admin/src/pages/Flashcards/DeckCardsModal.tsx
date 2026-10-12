import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/modal";
import Button from "../../components/ui/button/Button";
import CardFormModal from "./CardFormModal";
import { deleteCard, getCards } from "../../lib/flashcards";
import { PencilIcon, PlusIcon, TrashBinIcon } from "../../icons";
import { ApiError } from "../../types/common";
import type { Flashcard, FlashcardDeck } from "../../types/flashcards";

type Props = {
  deck: FlashcardDeck;
  onClose: () => void;
  /** Lets the parent keep its own card_count in sync without a full refetch of the deck list. */
  onCardCountChange: (deckId: number, count: number) => void;
};

type FormMode = { mode: "create" } | { mode: "edit"; card: Flashcard };

export default function DeckCardsModal({
  deck,
  onClose,
  onCardCountChange,
}: Props) {
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getCards(deck.id)
      .then((res) => {
        if (!cancelled) setCards(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Couldn't load cards.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deck.id, reloadToken]);

  function handleSaved(card: Flashcard) {
    setFormMode(null);
    setCards((prev) => {
      const exists = prev.some((c) => c.id === card.id);
      const next = exists
        ? prev.map((c) => (c.id === card.id ? card : c))
        : [...prev, card];
      onCardCountChange(deck.id, next.length);
      return next;
    });
  }

  async function handleDelete(card: Flashcard) {
    if (!window.confirm("Delete this card? This can't be undone.")) return;
    setActionError(null);
    setDeletingId(card.id);
    try {
      await deleteCard(card.id);
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== card.id);
        onCardCountChange(deck.id, next.length);
        return next;
      });
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't delete this card.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-2xl">
      <div className="max-h-[80vh] overflow-y-auto rounded-3xl bg-white p-6 dark:bg-gray-dark">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {deck.title}
            </h3>
            <p className="text-sm text-gray-400">Cards in this deck</p>
          </div>
          <Button
            size="sm"
            onClick={() => setFormMode({ mode: "create" })}
            className="shrink-0"
          >
            <PlusIcon className="mr-1.5 h-3.5 w-3.5" />
            Add card
          </Button>
        </div>

        {actionError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {actionError}
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="shrink-0 font-medium hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-error-200 p-4 dark:border-error-500/30">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
            <button
              type="button"
              onClick={() => setReloadToken((n) => n + 1)}
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Try again
            </button>
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-10 text-center dark:border-gray-800">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              No cards yet
            </p>
            <p className="text-xs text-gray-400">
              Add the first card to this deck.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {[...cards]
              .sort((a, b) => a.order - b.order)
              .map((card) => (
                <li
                  key={card.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {card.question}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {card.answer}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFormMode({ mode: "edit", card })}
                      aria-label="Edit card"
                      title="Edit card"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === card.id}
                      onClick={() => handleDelete(card)}
                      aria-label="Delete card"
                      title="Delete card"
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-error-500/10 dark:hover:text-error-400"
                    >
                      {deletingId === card.id ? (
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <TrashBinIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {formMode && (
        <CardFormModal
          card={formMode.mode === "edit" ? formMode.card : null}
          deckId={deck.id}
          onClose={() => setFormMode(null)}
          onSaved={handleSaved}
        />
      )}
    </Modal>
  );
}
