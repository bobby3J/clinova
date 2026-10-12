<?php

namespace Tests\Feature\AiPractice;

use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class GeneratePracticeSetTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_a_student_can_generate_a_practice_set_for_a_published_topic(): void
    {
        $topic = Topic::factory()->create();
        StudyMaterial::factory()->published()->create([
            'topic_id' => $topic->id,
            'type' => 'note',
            'body' => 'The normal adult resting heart rate ranges from sixty to one hundred beats per minute.',
        ]);

        $response = $this->actingAs($this->student())
            ->postJson('/api/ai-practice/sets', ['topic_id' => $topic->id]);

        $response->assertCreated();
        $this->assertSame($topic->id, $response->json('data.topic_id'));
        $this->assertCount(1, $response->json('data.questions'));
        $this->assertCount(4, $response->json('data.questions.0.options'));
        // Nothing answered yet — correct_option/explanation stay hidden,
        // same conditional-field pattern StudyMaterialResource already
        // uses for admin-only fields.
        $this->assertArrayNotHasKey('correct_option', $response->json('data.questions.0'));
        $this->assertArrayNotHasKey('explanation', $response->json('data.questions.0'));
    }

    public function test_generating_a_set_fails_with_no_published_materials(): void
    {
        $topic = Topic::factory()->create();
        StudyMaterial::factory()->create(['topic_id' => $topic->id]); // stays draft

        $this->actingAs($this->student())
            ->postJson('/api/ai-practice/sets', ['topic_id' => $topic->id])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('topic_id');

        $this->assertDatabaseCount('ai_practice_sets', 0);
    }

    public function test_a_set_is_capped_at_50_questions_even_with_a_lot_of_material_text(): void
    {
        $topic = Topic::factory()->create();
        $sentences = collect(range(1, 60))
            ->map(fn ($i) => "This is test sentence number {$i} for cap verification purposes.")
            ->implode(' ');
        StudyMaterial::factory()->published()->create([
            'topic_id' => $topic->id,
            'type' => 'note',
            'body' => $sentences,
        ]);

        $response = $this->actingAs($this->student())
            ->postJson('/api/ai-practice/sets', ['topic_id' => $topic->id]);

        $response->assertCreated();
        $this->assertCount(50, $response->json('data.questions'));
    }

    public function test_a_single_material_can_produce_many_questions(): void
    {
        $topic = Topic::factory()->create();
        $sentences = collect(range(1, 10))
            ->map(fn ($i) => "This is test sentence number {$i} for multi question verification.")
            ->implode(' ');
        StudyMaterial::factory()->published()->create([
            'topic_id' => $topic->id,
            'type' => 'note',
            'body' => $sentences,
        ]);

        $response = $this->actingAs($this->student())
            ->postJson('/api/ai-practice/sets', ['topic_id' => $topic->id]);

        $response->assertCreated();
        $this->assertCount(10, $response->json('data.questions'));
    }

    public function test_generating_a_set_requires_a_real_topic(): void
    {
        $this->actingAs($this->student())
            ->postJson('/api/ai-practice/sets', ['topic_id' => 999999])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('topic_id');
    }

    /**
     * video/audio materials (and any note/tip with no usable body text)
     * fall back to TemplateQuestionGenerator's type-identification
     * question rather than being skipped — confirms every published
     * material type actually produces a question, not just text-heavy
     * notes.
     */
    public function test_a_video_material_with_no_body_still_produces_a_question(): void
    {
        $topic = Topic::factory()->create();
        StudyMaterial::factory()->published()->create([
            'topic_id' => $topic->id,
            'type' => 'video',
            'body' => null,
            'url' => 'https://example.com/video.mp4',
        ]);

        $response = $this->actingAs($this->student())
            ->postJson('/api/ai-practice/sets', ['topic_id' => $topic->id]);

        $response->assertCreated();
        $this->assertCount(1, $response->json('data.questions'));
    }
}
