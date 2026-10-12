<?php

namespace Tests\Feature\Admin;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

/**
 * The other half of every "lecturer can..." test scattered across
 * StudyLibrary/Flashcards: this file proves lecturer access actually
 * *stops* at the domains that stayed admin-only on purpose (users,
 * lecturer management itself, announcements, activity log, analytics,
 * sound library). Not exhaustive per-route — one representative check per
 * domain boundary, confirming the role split holds both ways.
 */
class LecturerBoundaryTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_lecturer_cannot_list_users(): void
    {
        $this->actingAs($this->lecturer())
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_lecturer_cannot_manage_other_lecturers(): void
    {
        $this->actingAs($this->lecturer())
            ->getJson('/api/admin/lecturers')
            ->assertForbidden();
    }

    public function test_lecturer_cannot_broadcast_an_announcement(): void
    {
        $this->actingAs($this->lecturer())
            ->postJson('/api/admin/announcements', [
                'title' => 'Should not send',
                'body' => 'Lecturer attempting a platform-wide broadcast.',
            ])
            ->assertForbidden();
    }

    public function test_lecturer_cannot_view_the_activity_log(): void
    {
        $this->actingAs($this->lecturer())
            ->getJson('/api/admin/activity-log')
            ->assertForbidden();
    }

    public function test_lecturer_cannot_view_analytics(): void
    {
        $this->actingAs($this->lecturer())
            ->getJson('/api/admin/analytics/overview')
            ->assertForbidden();
    }

    public function test_lecturer_cannot_manage_sounds(): void
    {
        $this->actingAs($this->lecturer())
            ->postJson('/api/sounds', [
                'name' => 'Should not save',
                'category' => 'Nature',
                'file_url' => 'https://example.com/a.mp3',
            ])
            ->assertForbidden();
    }
}
