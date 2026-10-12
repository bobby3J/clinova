<?php

namespace App\Domain\Flashcards\Models;

use Database\Factories\FlashcardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['deck_id', 'question', 'answer', 'order'])]
#[UseFactory(FlashcardFactory::class)]

class Flashcard extends Model
{
    use HasFactory;

    public function deck(): BelongsTo
    {
        return $this->belongsTo(FlashcardDeck::class, 'deck_id');
    }

    /**
     * Every student who has ever reviewed this card has their own row here
     * — NOT scoped to "the current user" at the relation level. Scoping
     * happens where it's used (see FlashcardProgressController), the same
     * way StudyMaterial::visibleToStudents() scopes at the query, not the
     * relation.
     */
    public function progress(): HasMany
    {
        return $this->hasMany(UserFlashcardProgress::class);
    }
}
