<?php

namespace Tests\Feature\Support;

use App\Domain\Support\Models\SupportTicket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class AdminSupportTicketTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_admin_sees_every_students_tickets(): void
    {
        SupportTicket::factory()->count(3)->create();

        $response = $this->actingAs($this->admin())->getJson('/api/admin/support/tickets');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_admin_can_filter_tickets_by_status(): void
    {
        SupportTicket::factory()->create(); // open
        SupportTicket::factory()->resolved()->create();

        $response = $this->actingAs($this->admin())
            ->getJson('/api/admin/support/tickets?status=resolved');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame('resolved', $response->json('data.0.status'));
    }

    public function test_a_student_cannot_reach_the_admin_support_routes(): void
    {
        $this->actingAs($this->student())
            ->getJson('/api/admin/support/tickets')
            ->assertForbidden();
    }

    /**
     * The one behavior this whole notification wiring exists for: an
     * admin's reply is the only kind of reply that results in the student
     * being notified — confirmed by directly counting the student's own
     * notifications() relation, same assertion style
     * AdminOperationsTest already uses for AnnouncementNotification.
     */
    public function test_an_admin_reply_notifies_the_student_who_filed_the_ticket(): void
    {
        $student = $this->student();
        $ticket = SupportTicket::factory()->for($student)->create();

        $this->assertSame(0, $student->notifications()->count());

        $this->actingAs($this->admin())
            ->postJson("/api/admin/support/tickets/{$ticket->id}/messages", [
                'message' => 'Thanks for the report — looking into it now.',
            ])
            ->assertCreated();

        $this->assertSame(1, $student->notifications()->count());
        $notification = $student->notifications()->first();
        $this->assertSame($ticket->id, $notification->data['support_ticket_id']);
    }

    public function test_admin_can_update_a_tickets_status(): void
    {
        $ticket = SupportTicket::factory()->create();

        $response = $this->actingAs($this->admin())
            ->patchJson("/api/admin/support/tickets/{$ticket->id}/status", [
                'status' => 'resolved',
            ]);

        $response->assertOk();
        $this->assertSame('resolved', $response->json('data.status'));
        $this->assertSame('resolved', $ticket->fresh()->status->value);
    }

    public function test_updating_status_rejects_an_unknown_value(): void
    {
        $ticket = SupportTicket::factory()->create();

        $this->actingAs($this->admin())
            ->patchJson("/api/admin/support/tickets/{$ticket->id}/status", [
                'status' => 'archived',
            ])
            ->assertUnprocessable();
    }

    public function test_a_student_cannot_update_a_tickets_status(): void
    {
        $ticket = SupportTicket::factory()->create();

        $this->actingAs($this->student())
            ->patchJson("/api/admin/support/tickets/{$ticket->id}/status", [
                'status' => 'resolved',
            ])
            ->assertForbidden();
    }

    /**
     * admin_support_name is only visible to admins — this is the admin
     * side of SupportTicketTest's "hidden from the ticket's own owner"
     * test: here it should actually be present.
     */
    public function test_student_name_is_visible_to_admin(): void
    {
        $student = $this->student();
        $ticket = SupportTicket::factory()->for($student)->create();

        $response = $this->actingAs($this->admin())
            ->getJson("/api/admin/support/tickets/{$ticket->id}");

        $this->assertSame($student->name, $response->json('data.student_name'));
    }
}
