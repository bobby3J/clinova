<?php

namespace Tests\Feature\StudyLibrary;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

/**
 * No asFrontend() anywhere in this file — unlike the Auth tests, these
 * routes are guarded by auth:sanctum, and actingAs($user) sets the
 * authenticated user directly without going through login or touching
 * session middleware at all. That's the normal way to test an
 * authenticated endpoint; the Referer-header dance in AuthenticationTest
 * is specifically for testing the login/logout endpoints themselves.
 */
class StudyMaterialTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_students_only_see_published_materials(): void
    {
        $topic = Topic::factory()->create();
        StudyMaterial::factory()->published()->count(2)->create(['topic_id' => $topic->id]);
        StudyMaterial::factory()->count(1)->create(['topic_id' => $topic->id]); // stays draft

        $response = $this->actingAs($this->student())
            ->getJson("/api/study-library/topics/{$topic->id}/materials");

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_admins_see_draft_materials_too(): void
    {
        $topic = Topic::factory()->create();
        StudyMaterial::factory()->published()->count(2)->create(['topic_id' => $topic->id]);
        StudyMaterial::factory()->count(1)->create(['topic_id' => $topic->id]);

        $response = $this->actingAs($this->admin())
            ->getJson("/api/study-library/topics/{$topic->id}/materials");

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_students_cannot_view_a_single_unpublished_material(): void
    {
        $material = StudyMaterial::factory()->create(); // draft by default

        $this->actingAs($this->student())
            ->getJson("/api/study-library/materials/{$material->id}")
            ->assertForbidden();
    }

    public function test_students_cannot_create_study_material(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($this->student())
            ->postJson('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'note',
                'title' => 'Hacked In',
                'body' => 'Should never save.',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('study_materials', ['title' => 'Hacked In']);
    }

    /**
     * This is the regression test for the exact bug Admin's build caught:
     * create() must leave status as 'draft' on the object handed back, not
     * null. If StudyMaterialController::store() ever drops the explicit
     * 'status' => ContentStatus::Draft again, this fails immediately
     * instead of silently shipping a broken Resource.
     */
    public function test_admin_can_create_a_study_material_as_a_draft(): void
    {
        $topic = Topic::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'note',
                'title' => 'Fluid Balance Basics',
                'body' => 'Intake vs output tracking.',
            ]);

        // assertCreated() (201), not assertOk() — this was wrong on the
        // first pass of writing this test. Laravel's ResourceResponse
        // checks the underlying model's wasRecentlyCreated flag (set by
        // Eloquent right after ::create()) and returns 201 automatically
        // when it's true, with no explicit status code needed in the
        // controller. Worth knowing: it means swapping ::create() for
        // ::firstOrCreate() on an existing row would silently drop this to
        // 200, since wasRecentlyCreated would be false.
        $response->assertCreated();

        $this->assertDatabaseHas('study_materials', [
            'title' => 'Fluid Balance Basics',
            'status' => ContentStatus::Draft->value,
        ]);
    }

    public function test_publishing_dispatches_the_admin_action_event(): void
    {
        Event::fake();

        $material = StudyMaterial::factory()->create();

        $this->actingAs($this->admin())
            ->postJson("/api/study-library/materials/{$material->id}/publish")
            ->assertOk();

        Event::assertDispatched(
            AdminActionPerformed::class,
            fn ($event) => $event->action === 'published_study_material' && $event->subject->is($material)
        );
    }

    /**
     * The integration version of the test above — no Event::fake() here,
     * so the real LogAdminActivity listener actually runs. This is what
     * proves the audit-log loop stays closed, not just that the event was
     * fired into the void.
     */
    public function test_publishing_creates_a_real_activity_log_entry(): void
    {
        $admin = $this->admin();
        $material = StudyMaterial::factory()->create();

        $this->actingAs($admin)
            ->postJson("/api/study-library/materials/{$material->id}/publish")
            ->assertOk();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'published_study_material',
            'subject_type' => (new StudyMaterial)->getMorphClass(),
            'subject_id' => $material->id,
        ]);

        $this->assertTrue($material->fresh()->status === ContentStatus::Published);
    }

    public function test_students_cannot_publish_a_material(): void
    {
        $material = StudyMaterial::factory()->create();

        $this->actingAs($this->student())
            ->postJson("/api/study-library/materials/{$material->id}/publish")
            ->assertForbidden();
    }

    /**
     * A lecturer gets the exact same create/view-draft access as an admin
     * on this domain — the role split only matters outside StudyLibrary/
     * Flashcards (see tests/Feature/Admin/LecturerBoundaryTest.php for the
     * other half of this: where lecturer access stops).
     */
    public function test_lecturer_can_create_a_study_material_as_a_draft(): void
    {
        $topic = Topic::factory()->create();

        $response = $this->actingAs($this->lecturer())
            ->postJson('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'note',
                'title' => 'Lecturer-authored note',
                'body' => 'Content from a lecturer account.',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('study_materials', [
            'title' => 'Lecturer-authored note',
            'status' => ContentStatus::Draft->value,
        ]);
    }

    public function test_lecturer_can_publish_a_material(): void
    {
        $material = StudyMaterial::factory()->create();

        $this->actingAs($this->lecturer())
            ->postJson("/api/study-library/materials/{$material->id}/publish")
            ->assertOk();

        $this->assertTrue($material->fresh()->status === ContentStatus::Published);
    }

    /**
     * A tip is text-based like a note (body required, no url) — this is
     * the one actual behavior change StoreStudyMaterialRequest's rules
     * needed, since the old required_unless:type,note rule silently
     * assumed note was the only text-based type.
     */
    public function test_a_tip_can_be_created_with_only_a_body(): void
    {
        $topic = Topic::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'tip',
                'title' => 'Know your normal ranges',
                'body' => 'Adult resting heart rate: 60-100 bpm.',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('study_materials', [
            'title' => 'Know your normal ranges',
            'type' => 'tip',
        ]);
    }

    public function test_a_tip_without_a_body_fails_validation(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'tip',
                'title' => 'Missing body',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('body');
    }

    public function test_admin_can_upload_a_slide_deck(): void
    {
        Storage::fake('public');
        $topic = Topic::factory()->create();

        // post(), not postJson() — see SoundTest's matching test for why:
        // postJson() JSON-encodes the body, which can't carry a real
        // UploadedFile.
        $response = $this->actingAs($this->admin())
            ->post('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'slides',
                'title' => 'Week 3 — Fluid Balance',
                'slide_file' => UploadedFile::fake()->create('week3.pdf', 500, 'application/pdf'),
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.body', null);
        $response->assertJsonPath('data.url', null);

        $material = StudyMaterial::where('title', 'Week 3 — Fluid Balance')->firstOrFail();
        $this->assertStringContainsString('materials/', $material->file_path);
        $this->assertStringContainsString('/storage/materials/', $material->resolvedFileUrl());
        $this->assertNotEmpty(Storage::disk('public')->files('materials'));
    }

    public function test_creating_a_slide_deck_without_a_file_fails_validation(): void
    {
        $topic = Topic::factory()->create();

        $this->actingAs($this->admin())
            ->postJson('/api/study-library/materials', [
                'topic_id' => $topic->id,
                'type' => 'slides',
                'title' => 'Missing file',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('slide_file');
    }

    public function test_admin_can_replace_a_slide_decks_file_on_update(): void
    {
        Storage::fake('public');
        $material = StudyMaterial::factory()->slides()->create();

        $response = $this->actingAs($this->admin())
            ->post("/api/study-library/materials/{$material->id}", [
                '_method' => 'PATCH',
                'slide_file' => UploadedFile::fake()->create('v2.pdf', 500, 'application/pdf'),
            ]);

        $response->assertOk();
        $material->refresh();
        $this->assertStringContainsString('materials/', $material->file_path);
        $this->assertNotEmpty(Storage::disk('public')->files('materials'));
    }

    public function test_a_non_slides_material_has_no_file_url(): void
    {
        $material = StudyMaterial::factory()->published()->create([
            'type' => 'note',
            'body' => 'Plain text content.',
        ]);

        $response = $this->actingAs($this->student())
            ->getJson("/api/study-library/materials/{$material->id}");

        $response->assertOk()->assertJsonPath('data.file_url', null);
    }
}
