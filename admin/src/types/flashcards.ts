import type { ContentStatus } from "./common";

/**
 * Mirrors FlashcardDeckResource/FlashcardResource exactly
 * (api/app/Domain/Flashcards/Http/Resources/*.php). Decks hang off Topic
 * the same way StudyMaterial does — see src/types/studyLibrary.ts for why
 * there's no bulk "all decks" or "all cards" endpoint, same situation here:
 *
 * - GET /flashcards/decks?topic_id=N   -> FlashcardDeck[] for that topic
 * - GET /flashcards/decks/{id}/cards   -> Flashcard[] for one deck only
 *
 * Decks and cards have full CRUD (Create/Update/Delete + Publish for
 * decks) — unlike Subject/Topic, which are Create+Read only.
 */
export interface FlashcardDeck {
  id: number;
  topic_id: number;
  title: string;
  description: string | null;
  // Only present on the decks index (withCount) — absent elsewhere.
  card_count?: number;
  // Admin only — absent (not null) for non-admin callers.
  status?: ContentStatus;
}

export interface Flashcard {
  id: number;
  deck_id: number;
  question: string;
  answer: string;
  order: number;
}

export interface CreateFlashcardDeckPayload {
  topic_id: number;
  title: string;
  description?: string | null;
}

/** topic_id is not editable — see UpdateFlashcardDeckRequest::rules(). */
export interface UpdateFlashcardDeckPayload {
  title?: string;
  description?: string | null;
}

export interface CreateFlashcardPayload {
  deck_id: number;
  question: string;
  answer: string;
  order?: number;
}

export interface UpdateFlashcardPayload {
  question?: string;
  answer?: string;
  order?: number;
}
