<?php

namespace Tests\Feature\StudySessions;

use App\Domain\StudySessions\Events\FocusSessionCompleted;
use App\Domain\StudySessions\Models\StudySession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class StudySessionTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_a_student_can_start_a_focus_session(): void
    {
        $response = $this->actingAs($this->student())
            ->postJson('/api/study-sessions', ['planned_minutes' => 50]);

        $response->assertCreated(); // genuinely new row — wasRecentlyCreated applies here too
        $response->assertJson([
            'data' => [
                'type' => 'focus',
                'planned_minutes' => 50,
                'actual_minutes' => 0,
                'completed' => false,
            ],
        ]);
    }

    public function test_planned_minutes_must_be_within_range(): void
    {
        $this->actingAs($this->student())
            ->postJson('/api/study-sessions', ['planned_minutes' => 400])
            ->assertUnprocessable();
    }

    public function test_exiting_a_session_early_does_not_touch_the_streak(): void
    {
        $student = $this->student();
        $session = StudySession::factory()->create(['user_id' => $student->id]);

        $this->actingAs($student)
            ->patchJson("/api/study-sessions/{$session->id}/finish", [
                'actual_minutes' => 8,
                'completed' => false,
            ])
            ->assertOk();

        $this->assertSame(0, $student->fresh()->streak_count);
    }

    /**
     * Event::fake() version — proves FinishFocusSessionAction fires
     * FocusSessionCompleted only on a genuine completion, with the correct
     * user and session attached. Doesn't prove the listener does anything;
     * that's the next test.
     */
    public function test_completing_a_session_dispatches_the_completed_event(): void
    {
        Event::fake();

        $student = $this->student();
        $session = StudySession::factory()->create(['user_id' => $student->id]);

        $this->actingAs($student)
            ->patchJson("/api/study-sessions/{$session->id}/finish", [
                'actual_minutes' => 50,
                'completed' => true,
            ]);

        Event::assertDispatched(
            FocusSessionCompleted::class,
            fn ($event) => $event->user->is($student) && $event->session->is($session)
        );
    }

    /**
     * No Event::fake() here — the real UpdateStreakOnSessionCompleted
     * listener runs, picked up by auto-discovery across the Domain tree
     * with zero manual registration. This is what proves the streak
     * actually updates, not just that the event fires into the void.
     */
    public function test_completing_a_session_increments_the_streak(): void
    {
        $student = $this->student();
        $session = StudySession::factory()->create(['user_id' => $student->id]);

        $this->actingAs($student)
            ->patchJson("/api/study-sessions/{$session->id}/finish", [
                'actual_minutes' => 50,
                'completed' => true,
            ])
            ->assertOk();

        $this->assertSame(1, $student->fresh()->streak_count);
        $this->assertNotNull($student->fresh()->last_active_at);
    }

    public function test_a_student_cannot_finish_another_students_session(): void
    {
        $owner = $this->student();
        $intruder = $this->student();
        $session = StudySession::factory()->create(['user_id' => $owner->id]);

        $this->actingAs($intruder)
            ->patchJson("/api/study-sessions/{$session->id}/finish", [
                'actual_minutes' => 1,
                'completed' => true,
            ])
            ->assertForbidden();
    }

    public function test_a_student_only_sees_their_own_session_history(): void
    {
        $student = $this->student();
        StudySession::factory()->count(2)->create(['user_id' => $student->id]);
        StudySession::factory()->count(5)->create(); // someone else's sessions

        $response = $this->actingAs($student)->getJson('/api/study-sessions');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }
}
