<?php

namespace App\Domain\Flashcards\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Flashcards\Models\Flashcard
 */
class FlashcardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'deck_id' => $this->deck_id,
            'question' => $this->question,
            'answer' => $this->answer,
            'order' => $this->order,
        ];
    }
}
