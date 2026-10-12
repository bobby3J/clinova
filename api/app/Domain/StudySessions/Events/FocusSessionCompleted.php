<?php

namespace App\Domain\StudySessions\Events;

use App\Domain\StudySessions\Models\StudySession;
use App\Domain\Users\Models\User;

/**
 * Fired only when a focus session genuinely completes (timer ran out), not
 * on an early exit — see FinishFocusSessionAction for exactly where this
 * gets dispatched. StudySessions doesn't know or care who's listening;
 * right now that's Users (streak update), but a future Notifications
 * domain could add "congrats on a 7-day streak" just by adding a listener,
 * with zero changes here.
 */
class FocusSessionCompleted
{
    public function __construct(
        public readonly User $user,
        public readonly StudySession $session,
    ) {}
}
