<?php

namespace Tests\Feature\Admin;

use App\Domain\Admin\Models\AdminActivityLog;
use App\Domain\Shared\Enums\Track;
use App\Domain\StudySessions\Models\StudySession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class AdminOperationsTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_broadcast_sends_a_notification_to_every_student(): void
    {
        $this->student();
        $this->student();
        $admin = $this->admin();

        $response = $this->actingAs($admin)
            ->postJson('/api/admin/announcements', [
                'title' => 'New content live',
                'body' => 'Check out the new deck.',
            ]);

        $response->assertOk();
        $this->assertSame(2, $response->json('data.recipient_count'));
        $this->assertDatabaseCount('notifications', 2);

        // The admin never receives their own broadcast — BroadcastAnnouncementAction
        // only ever queries User::role('student').
        $this->assertSame(0, $admin->notifications()->count());
    }

    public function test_broadcast_respects_the_track_filter(): void
    {
        $nursingStudent = $this->student();
        $nursingStudent->update(['track' => Track::Nursing]);

        $midwiferyStudent = $this->student();
        $midwiferyStudent->update(['track' => Track::Midwifery]);

        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/announcements', [
                'title' => 'Nursing-only update',
                'body' => 'Just for nursing students.',
                'track' => 'nursing',
            ]);

        $this->assertSame(1, $response->json('data.recipient_count'));
        $this->assertSame(1, $nursingStudent->notifications()->count());
        $this->assertSame(0, $midwiferyStudent->notifications()->count());
    }

    public function test_activity_log_lists_logged_actions(): void
    {
        $admin = $this->admin();
        AdminActivityLog::factory()->create(['admin_id' => $admin->id, 'action' => 'suspended_user']);

        $response = $this->actingAs($admin)->getJson('/api/admin/activity-log');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('suspended_user', $response->json('data.0.action'));
        $this->assertSame($admin->name, $response->json('data.0.admin_name'));
    }

    /**
     * Proves ->paginate() actually paginates, not just that passing a
     * paginator to Resource::collection() doesn't error — 25 entries
     * against the default per_page of 20 is specifically chosen to be
     * just over one page, so this fails loudly if the per_page default
     * or the "only one page's worth in `data`" behavior ever regresses.
     */
    public function test_activity_log_is_paginated(): void
    {
        $admin = $this->admin();
        AdminActivityLog::factory()->count(25)->create(['admin_id' => $admin->id]);

        $response = $this->actingAs($admin)->getJson('/api/admin/activity-log');

        $response->assertOk();
        $this->assertCount(20, $response->json('data'));
        $this->assertSame(25, $response->json('meta.total'));
        $this->assertSame(2, $response->json('meta.last_page'));

        $page2 = $this->actingAs($admin)->getJson('/api/admin/activity-log?page=2');
        $page2->assertOk();
        $this->assertCount(5, $page2->json('data'));
    }

    public function test_analytics_overview_returns_the_expected_shape(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/admin/analytics/overview');

        $response->assertOk();
        $response->assertJsonStructure([
            'data' => [
                'active_students_7d',
                'study_hours_7d',
                'avg_session_minutes',
                'new_signups_7d',
            ],
        ]);
    }

    /**
     * 30 entries even with zero sessions in the database at all — proves
     * the zero-fill happens regardless of real data, not just alongside it.
     */
    public function test_study_activity_is_zero_filled_for_every_day_in_the_window(): void
    {
        $response = $this->actingAs($this->admin())->getJson('/api/admin/analytics/study-activity');

        $response->assertOk();
        $this->assertCount(30, $response->json('data'));
        $this->assertSame(now()->format('Y-m-d'), $response->json('data.29.date'));
        $this->assertSame(0, $response->json('data.29.minutes'));
        $this->assertSame(0, $response->json('data.29.sessions'));
    }

    public function test_study_activity_aggregates_completed_sessions_per_day(): void
    {
        // completed()'s state computes actual_minutes from planned_minutes
        // using whatever planned_minutes was *before* any create()-time
        // override is applied (states resolve before final overrides do),
        // so actual_minutes is set directly here instead of relying on
        // that state to derive it from an overridden planned_minutes.
        $student = $this->student();
        StudySession::factory()->completed()->create([
            'user_id' => $student->id,
            'actual_minutes' => 25,
            'started_at' => now(),
        ]);
        StudySession::factory()->completed()->create([
            'user_id' => $student->id,
            'actual_minutes' => 50,
            'started_at' => now(),
        ]);

        // Incomplete session on the same day — shouldn't count toward
        // either total, since it never finished.
        StudySession::factory()->create([
            'user_id' => $student->id,
            'started_at' => now(),
        ]);

        $response = $this->actingAs($this->admin())->getJson('/api/admin/analytics/study-activity');

        $response->assertOk();
        $this->assertSame(75, $response->json('data.29.minutes'));
        $this->assertSame(2, $response->json('data.29.sessions'));
    }

    public function test_study_activity_respects_the_days_query_param(): void
    {
        $response = $this->actingAs($this->admin())
            ->getJson('/api/admin/analytics/study-activity?days=7');

        $response->assertOk();
        $this->assertCount(7, $response->json('data'));
    }
}
