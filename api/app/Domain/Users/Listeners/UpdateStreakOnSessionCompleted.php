<?php

namespace App\Domain\Users\Listeners;

use App\Domain\StudySessions\Events\FocusSessionCompleted;

/**
 * Auto-discovered by App\Providers\EventServiceProvider purely because this
 * method is named handle() and type-hints FocusSessionCompleted — nothing
 * to register by hand. This is the whole payoff of the Events pattern:
 * StudySessions fires an event with no idea this class exists.
 *
 * Streak rule: completing a session today, having last been active
 * yesterday, extends the streak by one. Already active today just no-ops
 * (finishing a second session the same day doesn't double-count). Any
 * bigger gap — or no prior activity at all — resets to a streak of 1.
 */
class UpdateStreakOnSessionCompleted
{
    public function handle(FocusSessionCompleted $event): void
    {
        $user = $event->user;
        $lastActive = $user->last_active_at;

        $streak = match (true) {
            $lastActive === null => 1,
            $lastActive->isToday() => $user->streak_count,
            $lastActive->isYesterday() => $user->streak_count + 1,
            default => 1,
        };

        $user->update([
            'streak_count' => $streak,
            'last_active_at' => now(),
        ]);
    }
}
