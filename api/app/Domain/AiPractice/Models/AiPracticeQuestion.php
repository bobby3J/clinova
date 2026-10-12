<?php

namespace App\Domain\AiPractice\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['set_id', 'question', 'options', 'correct_option', 'explanation', 'order'])]
class AiPracticeQuestion extends Model
{
    protected function casts(): array
    {
        return [
            'options' => 'array',
        ];
    }

    public function set(): BelongsTo
    {
        return $this->belongsTo(AiPracticeSet::class, 'set_id');
    }

    public function answers(): HasMany
    {
        return $this->hasMany(AiPracticeAnswer::class, 'question_id');
    }
}
