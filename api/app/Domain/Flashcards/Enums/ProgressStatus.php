<?php

namespace App\Domain\Flashcards\Enums;

/**
 * Where a student is on a single flashcard's spaced-repetition journey.
 * Driven by ReviewFlashcardAction, not set directly — see that class for
 * the thresholds that move a card between these three states.
 */
enum ProgressStatus: string
{
    case New = 'new';
    case Learning = 'learning';
    case Mastered = 'mastered';
}
