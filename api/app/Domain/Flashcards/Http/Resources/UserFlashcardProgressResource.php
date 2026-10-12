<?php

namespace App\Domain\Flashcards\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Flashcards\Models\UserFlashcardProgress
 */
class UserFlashcardProgressResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'flashcard_id' => $this->flashcard_id,
            'status' => $this->status->value,
            // Explicit (float) cast — the model's decimal:2 cast hands us a
            // string ("2.60") to protect arithmetic from float drift, but
            // that's an internal concern; the JSON contract should still be
            // a number, not a numeric string a client has to parse.
            'ease_factor' => (float) $this->ease_factor,
            'interval_days' => $this->interval_days,
            'last_reviewed_at' => $this->last_reviewed_at,
            'next_review_at' => $this->next_review_at,
        ];
    }
}
