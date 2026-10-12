import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type {
  CreateFlashcardDeckPayload,
  CreateFlashcardPayload,
  Flashcard,
  FlashcardDeck,
  UpdateFlashcardDeckPayload,
  UpdateFlashcardPayload,
} from "../types/flashcards";

/** One function per Flashcards endpoint — see api/docs/API_REFERENCE.md §Flashcards. */

export function getDecks(topicId: number) {
  return apiGet<ApiListResponse<FlashcardDeck>>(
    `/flashcards/decks?topic_id=${topicId}`,
  );
}

export function createDeck(payload: CreateFlashcardDeckPayload) {
  return apiPost<ApiResponse<FlashcardDeck>>("/flashcards/decks", payload);
}

export function updateDeck(id: number, payload: UpdateFlashcardDeckPayload) {
  return apiPatch<ApiResponse<FlashcardDeck>>(
    `/flashcards/decks/${id}`,
    payload,
  );
}

export function publishDeck(id: number) {
  return apiPost<ApiResponse<FlashcardDeck>>(`/flashcards/decks/${id}/publish`);
}

/** Cascades to the deck's cards — see the backend comment. */
export function deleteDeck(id: number) {
  return apiDelete<void>(`/flashcards/decks/${id}`);
}

export function getCards(deckId: number) {
  return apiGet<ApiListResponse<Flashcard>>(`/flashcards/decks/${deckId}/cards`);
}

export function createCard(payload: CreateFlashcardPayload) {
  return apiPost<ApiResponse<Flashcard>>("/flashcards/cards", payload);
}

export function updateCard(id: number, payload: UpdateFlashcardPayload) {
  return apiPatch<ApiResponse<Flashcard>>(`/flashcards/cards/${id}`, payload);
}

export function deleteCard(id: number) {
  return apiDelete<void>(`/flashcards/cards/${id}`);
}
