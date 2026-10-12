<?php

namespace App\Domain\Flashcards\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Flashcards\Models\FlashcardDeck
 */
class FlashcardDeckResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'topic_id' => $this->topic_id,
            'title' => $this->title,
            'description' => $this->description,
            'card_count' => $this->whenCounted('flashcards'),
            // Passed as a closure, not a plain value: when()'s second
            // argument is evaluated eagerly by PHP at the call site unless
            // it's a Closure, so a plain $this->status->value here would
            // run even for non-admins — wasteful, and one status/null edge
            // case away from throwing regardless of the condition.
            'status' => $this->when(
                $request->user()?->canManageStudyContent(),
                fn () => $this->status?->value
            ),
        ];
    }
}
