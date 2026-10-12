<?php

namespace Tests\Feature\Users;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

/**
 * No new table — these endpoints just read/update the authenticated
 * user's own rows in Laravel's built-in notifications table, already
 * populated by BroadcastAnnouncementAction (AnnouncementNotification).
 */
class NotificationTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_a_student_can_list_their_own_notifications(): void
    {
        $student = $this->student();
        $this->actingAs($this->admin())->postJson('/api/admin/announcements', [
            'title' => 'New content live',
            'body' => 'Check out the new deck.',
        ]);

        $response = $this->actingAs($student)->getJson('/api/notifications');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('New content live', $response->json('data.0.title'));
        $this->assertSame('Check out the new deck.', $response->json('data.0.body'));
        $this->assertNull($response->json('data.0.read_at'));
        $this->assertSame(1, $response->json('meta.unread_count'));
    }

    public function test_a_student_only_sees_their_own_notifications(): void
    {
        $this->student();
        $other = $this->student();
        $this->actingAs($this->admin())->postJson('/api/admin/announcements', [
            'title' => 'Broadcast to everyone',
            'body' => 'Reaches both students.',
        ]);

        $response = $this->actingAs($other)->getJson('/api/notifications');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame(1, $response->json('meta.unread_count'));
    }

    public function test_marking_all_read_clears_the_unread_count(): void
    {
        $student = $this->student();
        $this->actingAs($this->admin())->postJson('/api/admin/announcements', [
            'title' => 'Title',
            'body' => 'Body',
        ]);

        $this->actingAs($student)
            ->postJson('/api/notifications/mark-all-read')
            ->assertNoContent();

        $response = $this->actingAs($student)->getJson('/api/notifications');
        $this->assertSame(0, $response->json('meta.unread_count'));
        $this->assertNotNull($response->json('data.0.read_at'));
    }
}
