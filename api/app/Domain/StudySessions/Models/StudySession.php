<?php

namespace App\Domain\StudySessions\Models;

use App\Domain\SoundLibrary\Models\Sound;
use App\Domain\StudySessions\Enums\SessionType;
use App\Domain\Users\Models\User;
use Database\Factories\StudySessionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * "Study With Me" — the flagship feature (Flow 3.2 in the blueprint). One
 * row per timer run, written at both ends: StartFocusSessionAction creates
 * it, FinishFocusSessionAction closes it out — either as a genuine
 * completion (timer ran out) or an early exit (student left mid-session).
 * Both outcomes get a row; that's deliberate, so a streak/progress query
 * never has to guess whether a session that "just stopped existing" means
 * it finished or was abandoned.
 */
#[Fillable(['user_id', 'sound_id', 'type', 'planned_minutes', 'actual_minutes', 'completed', 'started_at', 'ended_at'])]
#[UseFactory(StudySessionFactory::class)]

class StudySession extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => SessionType::class,
            'completed' => 'boolean',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sound(): BelongsTo
    {
        return $this->belongsTo(Sound::class);
    }
}
