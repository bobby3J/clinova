<?php

namespace App\Domain\Users\Models;

use App\Domain\SoundLibrary\Models\Sound;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One row per student, created lazily on first GET/PUT /user/settings
 * (SettingsController::firstOrCreate) rather than at registration time —
 * the table sat unused since the original migration with no model/
 * controller/route at all until this pass. DB-level defaults
 * (default_duration_minutes: 25, auto_breaks/notifications_enabled: true)
 * match StudySession's own 5-180 minute validation range, not invented
 * fresh.
 */
#[Fillable(['user_id', 'default_duration_minutes', 'default_sound_id', 'auto_breaks', 'notifications_enabled'])]
class UserSetting extends Model
{
    protected function casts(): array
    {
        return [
            'auto_breaks' => 'boolean',
            'notifications_enabled' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function defaultSound(): BelongsTo
    {
        return $this->belongsTo(Sound::class, 'default_sound_id');
    }
}
