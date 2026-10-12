<?php

namespace App\Domain\Flashcards\Http\Requests;

use App\Domain\Flashcards\Models\FlashcardDeck;
use Illuminate\Foundation\Http\FormRequest;

class StoreFlashcardRequest extends FormRequest
{
    /**
     * Adding a card is really "editing this deck's content" — authorized
     * against the parent FlashcardDeck's update ability, not a standalone
     * Flashcard permission (Flashcard has no Policy of its own; it's never
     * meaningfully authorized apart from the deck it belongs to).
     *
     * Guard against a missing/invalid deck_id explicitly: Gate::can()
     * would otherwise be handed null, and FlashcardDeckPolicy::update()
     * type-hints a real FlashcardDeck — passing null blows up with a
     * TypeError instead of a clean 403.
     */
    public function authorize(): bool
    {
        $deck = FlashcardDeck::find($this->input('deck_id'));

        return $deck !== null && $this->user()->can('update', $deck);
    }

    public function rules(): array
    {
        return [
            'deck_id' => ['required', 'integer', 'exists:flashcard_decks,id'],
            'question' => ['required', 'string'],
            'answer' => ['required', 'string'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
