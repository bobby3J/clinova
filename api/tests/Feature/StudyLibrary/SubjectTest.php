<?php

namespace Tests\Feature\StudyLibrary;

use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Subject;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class SubjectTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_admin_can_create_a_subject(): void
    {
        $response = $this->actingAs($this->admin())
            ->postJson('/api/study-library/subjects', [
                'name' => 'Pediatric Nursing',
                'track' => 'nursing',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('subjects', [
            'name' => 'Pediatric Nursing',
            'track' => 'nursing',
        ]);
    }

    public function test_students_cannot_create_a_subject(): void
    {
        $this->actingAs($this->student())
            ->postJson('/api/study-library/subjects', [
                'name' => 'Hacked Subject',
                'track' => 'nursing',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('subjects', ['name' => 'Hacked Subject']);
    }

    public function test_admin_can_update_a_subject(): void
    {
        $subject = Subject::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($this->admin())
            ->patchJson("/api/study-library/subjects/{$subject->id}", [
                'name' => 'New Name',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('subjects', [
            'id' => $subject->id,
            'name' => 'New Name',
        ]);
    }

    public function test_students_cannot_update_a_subject(): void
    {
        $subject = Subject::factory()->create(['name' => 'Old Name']);

        $this->actingAs($this->student())
            ->patchJson("/api/study-library/subjects/{$subject->id}", [
                'name' => 'Hacked Name',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('subjects', ['id' => $subject->id, 'name' => 'Old Name']);
    }

    public function test_admin_can_delete_a_subject(): void
    {
        $subject = Subject::factory()->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/study-library/subjects/{$subject->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('subjects', ['id' => $subject->id]);
    }

    public function test_students_cannot_delete_a_subject(): void
    {
        $subject = Subject::factory()->create();

        $this->actingAs($this->student())
            ->deleteJson("/api/study-library/subjects/{$subject->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
    }

    /**
     * The cascade itself is enforced at the DB level (the migrations'
     * ->cascadeOnDelete() calls), not in application code — this test
     * exists to prove that's actually true end to end, not just assumed
     * from reading the migration file.
     */
    public function test_deleting_a_subject_cascades_to_its_topics_and_materials(): void
    {
        $subject = Subject::factory()->create();
        $topic = Topic::factory()->for($subject)->create();
        $material = StudyMaterial::factory()->for($topic)->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/study-library/subjects/{$subject->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('topics', ['id' => $topic->id]);
        $this->assertDatabaseMissing('study_materials', ['id' => $material->id]);
    }

    /**
     * Unlike create/update above, delete now writes to the Activity Log —
     * an irreversible cascading delete clears the bar the rest of the app
     * already uses for what gets audited (see SubjectController::destroy()'s
     * comment). Routine edits still aren't logged; only this is new.
     */
    public function test_deleting_a_subject_creates_an_activity_log_entry(): void
    {
        $admin = $this->admin();
        $subject = Subject::factory()->create(['name' => 'Obstetric Emergencies']);

        $this->actingAs($admin)
            ->deleteJson("/api/study-library/subjects/{$subject->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'deleted_subject',
            'subject_type' => (new Subject)->getMorphClass(),
            'subject_id' => $subject->id,
            'description' => 'Deleted subject "Obstetric Emergencies"',
        ]);
    }

    /**
     * Lecturers get full parity with admin on the curriculum taxonomy
     * itself, not just on content within it — confirmed deliberately, not
     * assumed, since "lecturer" could plausibly have meant content-only.
     * See tests/Feature/Admin/LecturerBoundaryTest.php for where lecturer
     * access actually stops (users/announcements/activity-log/analytics/
     * sounds stay admin-only).
     */
    public function test_lecturer_can_create_a_subject(): void
    {
        $response = $this->actingAs($this->lecturer())
            ->postJson('/api/study-library/subjects', [
                'name' => 'Community Health Nursing',
                'track' => 'nursing',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('subjects', ['name' => 'Community Health Nursing']);
    }

    public function test_lecturer_can_delete_a_subject(): void
    {
        $subject = Subject::factory()->create();

        $this->actingAs($this->lecturer())
            ->deleteJson("/api/study-library/subjects/{$subject->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('subjects', ['id' => $subject->id]);
    }
}
