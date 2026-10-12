<?php

namespace App\Domain\Flashcards\Http\Requests;

use App\Domain\Flashcards\Models\FlashcardDeck;
use Illuminate\Foundation\Http\FormRequest;

class StoreFlashcardDeckRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', FlashcardDeck::class);
    }

    public function rules(): array
    {
        return [
            'topic_id' => ['required', 'integer', 'exists:topics,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
