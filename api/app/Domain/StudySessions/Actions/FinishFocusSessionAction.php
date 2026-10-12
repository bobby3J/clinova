<?php

namespace App\Domain\StudySessions\Actions;

use App\Domain\StudySessions\Events\FocusSessionCompleted;
use App\Domain\StudySessions\Models\StudySession;
use App\Support\Actions\Action;

/**
 * Handles both outcomes of Flow 3.2's decision diamond. The event only
 * fires on a genuine completion — an early exit still gets its row saved
 * (so the session history and total-minutes stats stay honest) but doesn't
 * touch the streak, matching Sheet 03's own note: "either way a
 * study_sessions row is written, complete or not."
 */
class FinishFocusSessionAction extends Action
{
    public function handle(StudySession $session, int $actualMinutes, bool $completed): StudySession
    {
        $session->update([
            'actual_minutes' => $actualMinutes,
            'completed' => $completed,
            'ended_at' => now(),
        ]);

        if ($completed) {
            event(new FocusSessionCompleted($session->user, $session));
        }

        return $session;
    }
}
