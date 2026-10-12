<?php

namespace App\Domain\Flashcards\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFlashcardRequest extends FormRequest
{
    /**
     * Same reasoning as StoreFlashcardRequest: a card has no Policy of its
     * own, so this authorizes against its parent deck's 'update' ability.
     * Route model binding has already resolved {flashcard} by the time
     * this runs, so ->deck is safe to touch here.
     */
    public function authorize(): bool
    {
        $flashcard = $this->route('flashcard');

        return $flashcard !== null && $this->user()->can('update', $flashcard->deck);
    }

    public function rules(): array
    {
        return [
            'question' => ['sometimes', 'string'],
            'answer' => ['sometimes', 'string'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
