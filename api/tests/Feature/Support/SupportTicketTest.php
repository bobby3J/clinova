<?php

namespace Tests\Feature\Support;

use App\Domain\Support\Models\SupportTicket;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class SupportTicketTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_a_student_can_open_a_ticket_with_an_initial_message(): void
    {
        $response = $this->actingAs($this->student())->postJson('/api/support/tickets', [
            'subject' => 'Sound upload is missing',
            'category' => 'bug',
            'message' => 'I uploaded Ocean Waves but it disappeared the next day.',
        ]);

        $response->assertCreated();
        $this->assertSame('open', $response->json('data.status'));
        $this->assertCount(1, $response->json('data.messages'));
        $this->assertSame(
            'I uploaded Ocean Waves but it disappeared the next day.',
            $response->json('data.messages.0.body'),
        );
        $this->assertDatabaseCount('support_tickets', 1);
        $this->assertDatabaseCount('support_ticket_messages', 1);
    }

    public function test_opening_a_ticket_requires_a_subject_and_message(): void
    {
        $this->actingAs($this->student())
            ->postJson('/api/support/tickets', ['category' => 'bug'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['subject', 'message']);
    }

    public function test_a_student_sees_only_their_own_tickets(): void
    {
        $student = $this->student();
        SupportTicket::factory()->for($student)->create();
        SupportTicket::factory()->create(); // another student's

        $response = $this->actingAs($student)->getJson('/api/support/tickets');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
    }

    public function test_a_student_can_view_their_own_ticket_thread(): void
    {
        $student = $this->student();
        $ticket = SupportTicket::factory()->for($student)->create();
        $ticket->messages()->create(['user_id' => $student->id, 'body' => 'First message']);

        $response = $this->actingAs($student)->getJson("/api/support/tickets/{$ticket->id}");

        $response->assertOk();
        $this->assertCount(1, $response->json('data.messages'));
    }

    public function test_a_student_cannot_view_another_students_ticket(): void
    {
        $ticket = SupportTicket::factory()->create();

        $this->actingAs($this->student())
            ->getJson("/api/support/tickets/{$ticket->id}")
            ->assertForbidden();
    }

    public function test_a_student_can_reply_to_their_own_ticket(): void
    {
        $student = $this->student();
        $ticket = SupportTicket::factory()->for($student)->create();

        $response = $this->actingAs($student)
            ->postJson("/api/support/tickets/{$ticket->id}/messages", [
                'message' => 'Any update on this?',
            ]);

        $response->assertCreated();
        $this->assertSame($student->name, $response->json('data.author_name'));
        $this->assertFalse($response->json('data.is_admin'));
    }

    /**
     * The counterpart to AdminSupportTicketTest's
     * test_an_admin_reply_notifies_the_student_who_filed_the_ticket — a
     * student replying to their own ticket shouldn't notify themselves.
     * ReplyToSupportTicketAction only fires the notification when the
     * author has the admin role.
     */
    public function test_a_students_own_reply_does_not_notify_anyone(): void
    {
        $student = $this->student();
        $ticket = SupportTicket::factory()->for($student)->create();

        $this->actingAs($student)
            ->postJson("/api/support/tickets/{$ticket->id}/messages", ['message' => 'Following up'])
            ->assertCreated();

        $this->assertSame(0, $student->notifications()->count());
    }

    public function test_a_student_cannot_reply_to_another_students_ticket(): void
    {
        $ticket = SupportTicket::factory()->create();

        $this->actingAs($this->student())
            ->postJson("/api/support/tickets/{$ticket->id}/messages", ['message' => 'Hi'])
            ->assertForbidden();
    }

    /**
     * The student-facing SupportTicketResource never reveals whose ticket
     * it is (that's only meaningful to an admin browsing everyone's) —
     * confirms the $this->when(...) admin gate in SupportTicketResource
     * actually withholds student_name from a non-admin caller.
     */
    public function test_student_name_is_hidden_from_the_tickets_own_owner(): void
    {
        $student = $this->student();
        $ticket = SupportTicket::factory()->for($student)->create();

        $response = $this->actingAs($student)->getJson("/api/support/tickets/{$ticket->id}");

        $this->assertArrayNotHasKey('student_name', $response->json('data'));
    }
}
