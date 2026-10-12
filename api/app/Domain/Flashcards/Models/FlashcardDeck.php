<?php

namespace App\Domain\Flashcards\Models;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Models\Topic;
use App\Domain\Users\Models\User;
use Database\Factories\FlashcardDeckFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A themed set of Flashcards under a Topic — same draft/in_review/published
 * review workflow as StudyMaterial, reusing the same shared ContentStatus
 * enum. Unlike StudyMaterial, there's no `published_at` column here (see
 * the migration) — don't assume the two tables are identical just because
 * the workflow looks the same.
 */
// status is fillable so PublishFlashcardDeckAction's update() call actually
// persists — same reasoning as StudyMaterial: StoreFlashcardDeckRequest
// never validates 'status', so client input can't reach it regardless.
#[Fillable(['topic_id', 'created_by', 'title', 'description', 'status'])]
#[UseFactory(FlashcardDeckFactory::class)]

class FlashcardDeck extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ContentStatus::class,
        ];
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function flashcards(): HasMany
    {
        return $this->hasMany(Flashcard::class, 'deck_id');
    }

    #[Scope]
    protected function visibleToStudents(Builder $query): void
    {
        $query->where('status', ContentStatus::Published);
    }
}
