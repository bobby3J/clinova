<?php

namespace App\Domain\Admin\Actions;

use App\Domain\StudySessions\Models\StudySession;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

/**
 * Sheet 06's Overview KPI tiles. Not a state-changing use case like the
 * others in this domain, but still one class per Sheet 02 use case ("View
 * Analytics") — and worth its own class specifically because it reads
 * across two other domains' tables (Users, StudySessions), which is more
 * than the "simple filtered list" case our own rule-of-thumb in
 * ARCHITECTURE.md says belongs directly in a controller.
 */
class GetOverviewMetricsAction extends Action
{
    public function handle(): array
    {
        $since = now()->subDays(7);

        $recentCompletedSessions = StudySession::query()
            ->where('completed', true)
            ->where('started_at', '>=', $since);

        return [
            'active_students_7d' => User::role('student')->where('last_active_at', '>=', $since)->count(),
            'study_hours_7d' => round((clone $recentCompletedSessions)->sum('actual_minutes') / 60, 1),
            'avg_session_minutes' => round((clone $recentCompletedSessions)->avg('actual_minutes') ?? 0, 1),
            'new_signups_7d' => User::role('student')->where('created_at', '>=', $since)->count(),
        ];
    }
}
