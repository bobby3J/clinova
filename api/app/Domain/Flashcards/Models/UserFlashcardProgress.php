<?php

namespace App\Domain\Flashcards\Models;

use App\Domain\Flashcards\Enums\ProgressStatus;
use App\Domain\Users\Models\User;
use Database\Factories\UserFlashcardProgressFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'flashcard_id', 'status', 'ease_factor', 'interval_days', 'last_reviewed_at', 'next_review_at'])]
#[UseFactory(UserFlashcardProgressFactory::class)]

class UserFlashcardProgress extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ProgressStatus::class,
            // decimal:2 rather than 'float' — ease_factor drives repeated
            // arithmetic in ReviewFlashcardAction, and float rounding drift
            // across hundreds of reviews is exactly the kind of bug that's
            // invisible until a card's interval quietly stops growing.
            'ease_factor' => 'decimal:2',
            'interval_days' => 'integer',
            'last_reviewed_at' => 'datetime',
            'next_review_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function flashcard(): BelongsTo
    {
        return $this->belongsTo(Flashcard::class);
    }
}
