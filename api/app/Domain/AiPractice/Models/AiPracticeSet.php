<?php

namespace App\Domain\AiPractice\Models;

use App\Domain\StudyLibrary\Models\Topic;
use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One row per "generate practice questions for this topic" request — the
 * questions themselves live in AiPracticeQuestion, not here, since a set
 * is just the grouping/ownership record.
 */
#[Fillable(['user_id', 'topic_id'])]
class AiPracticeSet extends Model
{
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(AiPracticeQuestion::class, 'set_id')->orderBy('order');
    }
}
