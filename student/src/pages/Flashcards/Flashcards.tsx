import { useEffect, useState } from "react";
import { Link } from "react-router";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import { CardsIcon, CheckIcon, ChevronLeftIcon } from "../../components/icons";
import { getDueCards, reviewCard } from "../../lib/flashcards";
import type { Flashcard } from "../../types/flashcards";

/**
 * Simplified Anki-style 4-button scale over the backend's raw 0-5
 * `quality` scorer — 0-2 all mean "failed recall, reset the interval" and
 * 3-5 only differ in how much the interval grows, so four buttons mapped
 * to one representative value each covers the real decision space a
 * student actually faces ("did I know this, and how well") without
 * asking them to pick a number 0-5 that means nothing to them.
 */
const QUALITY_OPTIONS = [
  { label: "Forgot", quality: 1, className: "bg-error-50 text-error-600" },
  { label: "Hard", quality: 3, className: "bg-warning-50 text-warning-600" },
  { label: "Good", quality: 4, className: "bg-brand-50 text-brand-600" },
  { label: "Easy", quality: 5, className: "bg-success-50 text-success-600" },
];

export default function Flashcards() {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);

  useEffect(() => {
    getDueCards()
      .then((res) => setQueue(res.data))
      .catch(() => setError("Couldn't load your flashcards. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, []);

  const currentCard = queue[0] ?? null;

  async function handleRate(quality: number) {
    if (!currentCard || submitting) return;
    setSubmitting(true);
    try {
      await reviewCard(currentCard.id, quality);
      setQueue((prev) => prev.slice(1));
      setReviewedCount((n) => n + 1);
      setShowAnswer(false);
    } catch {
      // The card just stays in the queue — the student can retry rating
      // it rather than losing their place in the review session.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-28 lg:mx-auto lg:max-w-xl lg:px-0 lg:pt-0 lg:pb-0">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/" className="text-gray-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 lg:text-2xl">Flashcards</h1>
        </div>

        {loading ? (
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
        ) : error ? (
          <p className="text-sm text-error-600">{error}</p>
        ) : !currentCard ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white py-16 text-center shadow-theme-sm">
            <CheckIcon className="h-8 w-8 text-success-500" />
            <p className="text-sm font-semibold text-gray-800">
              {reviewedCount > 0 ? "All caught up!" : "Nothing due right now"}
            </p>
            <p className="max-w-xs text-xs text-gray-400">
              {reviewedCount > 0
                ? `You reviewed ${reviewedCount} card${reviewedCount === 1 ? "" : "s"}. Check back later for more.`
                : "New or due cards will show up here as published decks add them."}
            </p>
            <Link to="/" className="mt-2 text-sm font-medium text-brand-600">
              Back to Home
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs font-medium text-gray-400">
              {queue.length} card{queue.length === 1 ? "" : "s"} left
            </p>

            <button
              type="button"
              onClick={() => setShowAnswer((v) => !v)}
              className="flex min-h-56 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-theme-sm"
            >
              <CardsIcon className="h-6 w-6 text-gray-300" />
              <p className="text-base font-semibold text-gray-800">{currentCard.question}</p>
              {showAnswer ? (
                <p className="border-t border-gray-100 pt-4 text-sm text-gray-600">
                  {currentCard.answer}
                </p>
              ) : (
                <p className="text-xs font-medium text-brand-500">Tap to reveal answer</p>
              )}
            </button>

            {showAnswer && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.quality}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRate(opt.quality)}
                    className={`h-11 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 ${opt.className}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
