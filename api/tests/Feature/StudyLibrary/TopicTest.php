<?php

namespace Tests\Feature\StudyLibrary;

use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Subject;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class TopicTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_admin_can_create_a_topic(): void
    {
        $subject = Subject::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/study-library/topics', [
                'subject_id' => $subject->id,
                'name' => 'Newborn Assessment',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('topics', [
            'subject_id' => $subject->id,
            'name' => 'Newborn Assessment',
        ]);
    }

    public function test_students_cannot_create_a_topic(): void
    {
        $subject = Subject::factory()->create();

        $this->actingAs($this->student())
            ->postJson('/api/study-library/topics', [
                'subject_id' => $subject->id,
                'name' => 'Hacked Topic',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('topics', ['name' => 'Hacked Topic']);
    }

    /**
     * Regression test for a real bug caught by manual curl verification,
     * not by this suite: 'order' has a DB-level default of 0, but the
     * 'order' validation rule is nullable-not-required, so an omitted
     * order used to reach TopicController::store() as an explicit `null`
     * and create() handed back a model with order === null instead of 0
     * — the exact "Model::create() doesn't reflect DB defaults" gotcha
     * documented in api/docs/ARCHITECTURE.md, just not caught here until
     * Flashcard hit the identical bug and prompted an audit of this one.
     */
    public function test_creating_a_topic_without_an_order_defaults_to_zero(): void
    {
        $subject = Subject::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/study-library/topics', [
                'subject_id' => $subject->id,
                'name' => 'No Explicit Order',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.order', 0);
    }

    public function test_admin_can_update_a_topic(): void
    {
        $topic = Topic::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($this->admin())
            ->patchJson("/api/study-library/topics/{$topic->id}", [
                'name' => 'New Name',
            ]);

        $response->assertOk();
        $this->assertDatabaseHas('topics', [
            'id' => $topic->id,
            'name' => 'New Name',
        ]);
    }

    public function test_students_cannot_update_a_topic(): void
    {
        $topic = Topic::factory()->create(['name' => 'Old Name']);

        $this->actingAs($this->student())
            ->patchJson("/api/study-library/topics/{$topic->id}", [
                'name' => 'Hacked Name',
            ])
            ->assertForbidden();

        $this->assertDatabaseHas('topics', ['id' => $topic->id, 'name' => 'Old Name']);
    }

    public function test_admin_can_delete_a_topic(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/study-library/topics/{$topic->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('topics', ['id' => $topic->id]);
    }

    public function test_students_cannot_delete_a_topic(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($this->student())
            ->deleteJson("/api/study-library/topics/{$topic->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('topics', ['id' => $topic->id]);
    }

    public function test_deleting_a_topic_cascades_to_its_materials(): void
    {
        $topic = Topic::factory()->create();
        $material = StudyMaterial::factory()->for($topic)->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/study-library/topics/{$topic->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('study_materials', ['id' => $material->id]);
    }

    /** See SubjectTest's equivalent — same reasoning, one level down. */
    public function test_deleting_a_topic_creates_an_activity_log_entry(): void
    {
        $admin = $this->admin();
        $topic = Topic::factory()->create(['name' => 'Postpartum Hemorrhage']);

        $this->actingAs($admin)
            ->deleteJson("/api/study-library/topics/{$topic->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'deleted_topic',
            'subject_type' => (new Topic)->getMorphClass(),
            'subject_id' => $topic->id,
            'description' => 'Deleted topic "Postpartum Hemorrhage"',
        ]);
    }
}
