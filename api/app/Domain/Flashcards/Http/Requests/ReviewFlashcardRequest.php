<?php

namespace App\Domain\Flashcards\Http\Requests;

use App\Domain\Shared\Enums\ContentStatus;
use Illuminate\Foundation\Http\FormRequest;

class ReviewFlashcardRequest extends FormRequest
{
    /**
     * Any signed-in student can review a card — but only if its deck has
     * actually been published. Without this check, a student could submit
     * reviews against draft content an admin hasn't approved yet, quietly
     * building SRS history for a card that might change or never ship.
     */
    public function authorize(): bool
    {
        $flashcard = $this->route('flashcard');

        return $flashcard->deck->status === ContentStatus::Published;
    }

    /**
     * `quality` follows the SM-2 algorithm's own 0-5 scale:
     * 0-2 = failed to recall (resets progress), 3-5 = recalled successfully
     * with increasing confidence. See ReviewFlashcardAction for exactly
     * how each value changes the schedule.
     */
    public function rules(): array
    {
        return [
            'quality' => ['required', 'integer', 'min:0', 'max:5'],
        ];
    }
}
