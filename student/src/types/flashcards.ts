/**
 * Matches FlashcardResource / UserFlashcardProgressResource exactly
 * (api/app/Domain/Flashcards/Http/Resources/).
 */
export interface Flashcard {
  id: number;
  deck_id: number;
  question: string;
  answer: string;
  order: number;
}

export type ProgressStatus = "new" | "learning" | "mastered";

export interface FlashcardProgress {
  flashcard_id: number;
  status: ProgressStatus;
  ease_factor: number;
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}
