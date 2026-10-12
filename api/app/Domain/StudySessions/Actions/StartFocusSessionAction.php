<?php

namespace App\Domain\StudySessions\Actions;

use App\Domain\StudySessions\Enums\SessionType;
use App\Domain\StudySessions\Models\StudySession;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

class StartFocusSessionAction extends Action
{
    public function handle(User $user, int $plannedMinutes, ?int $soundId): StudySession
    {
        // type/actual_minutes/completed all have DB-level defaults — set
        // explicitly per the rule in ARCHITECTURE.md rather than trust
        // create() to reflect them on the object handed back.
        return StudySession::create([
            'user_id' => $user->id,
            'sound_id' => $soundId,
            'type' => SessionType::Focus,
            'planned_minutes' => $plannedMinutes,
            'actual_minutes' => 0,
            'completed' => false,
            'started_at' => now(),
        ]);
    }
}
