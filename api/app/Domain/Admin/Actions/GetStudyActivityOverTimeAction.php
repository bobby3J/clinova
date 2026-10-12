<?php

namespace App\Domain\Admin\Actions;

use App\Domain\StudySessions\Models\StudySession;
use App\Support\Actions\Action;
use Illuminate\Support\Facades\DB;

/**
 * Sheet 06's "study activity over time" chart. Same two-domain-read
 * justification as GetOverviewMetricsAction for living in its own Action
 * class rather than directly in AnalyticsController.
 *
 * Grouping by day happens in SQL (DB::raw DATE(started_at)), not by
 * pulling every session row and bucketing in PHP — this table only grows,
 * and letting the database do the aggregation means the response size
 * stays at "30 rows" regardless of how many sessions actually ran.
 */
class GetStudyActivityOverTimeAction extends Action
{
    public function handle(int $days = 30): array
    {
        $since = now()->subDays($days - 1)->startOfDay();

        $rows = StudySession::query()
            ->where('completed', true)
            ->where('started_at', '>=', $since)
            ->select([
                DB::raw('DATE(started_at) as date'),
                DB::raw('SUM(actual_minutes) as minutes'),
                DB::raw('COUNT(*) as sessions'),
            ])
            ->groupBy('date')
            ->get()
            ->keyBy(fn ($row) => $row->date);

        // Every day in the window is pre-seeded at 0 *before* the real
        // rows are laid over it — otherwise a day with no completed
        // sessions would just be absent from the response, and the
        // frontend would have to re-derive "missing means zero" itself.
        // Mirrors the same pre-seeding the signups chart already does
        // client-side (SignupsTrendChart.tsx), just done here in SQL/PHP
        // instead because this is a dedicated aggregate endpoint.
        $buckets = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->format('Y-m-d');
            $row = $rows->get($date);

            $buckets[] = [
                'date' => $date,
                'minutes' => $row ? (int) $row->minutes : 0,
                'sessions' => $row ? (int) $row->sessions : 0,
            ];
        }

        return $buckets;
    }
}
