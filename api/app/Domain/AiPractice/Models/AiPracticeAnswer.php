<?php

namespace App\Domain\AiPractice\Models;

use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Append-only, same honest-log shape as StudySession — a row records what
 * happened (which option a student picked, whether it was right), never
 * mutated after the fact. A student re-answering the same question just
 * adds another row, it doesn't overwrite the first attempt.
 */
#[Fillable(['question_id', 'user_id', 'selected_option', 'is_correct'])]
class AiPracticeAnswer extends Model
{
    protected function casts(): array
    {
        return [
            'is_correct' => 'boolean',
        ];
    }

    public function question(): BelongsTo
    {
        return $this->belongsTo(AiPracticeQuestion::class, 'question_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
