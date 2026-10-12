<?php

namespace App\Domain\Flashcards\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFlashcardDeckRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Route model binding has already resolved a FlashcardDeck by the
        // time this runs — authorize against that instance so
        // FlashcardDeckPolicy::update() runs, same pattern as
        // UpdateStudyMaterialRequest.
        return $this->user()->can('update', $this->route('flashcardDeck'));
    }

    /**
     * topic_id is deliberately not editable — same reasoning as Topic's
     * subject_id: moving a deck to a different topic is a structural
     * change, not a field edit, and the product has no use case for it yet.
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ];
    }
}
