import { apiGet, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type { Flashcard, FlashcardProgress } from "../types/flashcards";

/**
 * GET /flashcards/due — cards due for review right now (never reviewed,
 * or past their next_review_at), published decks only. No deck_id filter
 * applied here — this app reviews across every due card globally, not
 * deck-by-deck (no deck-browsing UI exists in this app yet).
 */
export function getDueCards() {
  return apiGet<ApiListResponse<Flashcard>>("/flashcards/due");
}

/**
 * POST /flashcards/{id}/review — quality is 0-5 (SM-2 style): 0-2 counts
 * as a failed recall (interval resets), 3-5 as success (interval grows).
 */
export function reviewCard(flashcardId: number, quality: number) {
  return apiPost<ApiResponse<FlashcardProgress>>(
    `/flashcards/${flashcardId}/review`,
    { quality },
  );
}
