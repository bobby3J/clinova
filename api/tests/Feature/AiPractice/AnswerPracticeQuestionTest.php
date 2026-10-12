<?php

namespace Tests\Feature\AiPractice;

use App\Domain\AiPractice\Models\AiPracticeQuestion;
use App\Domain\AiPractice\Models\AiPracticeSet;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class AnswerPracticeQuestionTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    private function makeQuestion(): AiPracticeQuestion
    {
        $set = AiPracticeSet::create([
            'user_id' => $this->student()->id,
            'topic_id' => Topic::factory()->create()->id,
        ]);

        return $set->questions()->create([
            'question' => 'Fill in the blank: "The normal adult _____ rate is 60-100 bpm."',
            'options' => ['heart', 'respiratory', 'metabolic', 'growth'],
            'correct_option' => 0,
            'explanation' => 'Template-generated, not AI — the full sentence reads: "The normal adult heart rate is 60-100 bpm."',
            'order' => 0,
        ]);
    }

    public function test_answering_correctly_is_scored_correctly(): void
    {
        $question = $this->makeQuestion();

        $response = $this->actingAs($this->student())
            ->postJson("/api/ai-practice/questions/{$question->id}/answer", ['selected_option' => 0]);

        $response->assertCreated();
        $this->assertTrue($response->json('data.is_correct'));
        $this->assertSame(0, $response->json('data.correct_option'));
        $this->assertNotNull($response->json('data.explanation'));
    }

    public function test_answering_incorrectly_is_scored_correctly(): void
    {
        $question = $this->makeQuestion();

        $response = $this->actingAs($this->student())
            ->postJson("/api/ai-practice/questions/{$question->id}/answer", ['selected_option' => 2]);

        $response->assertCreated();
        $this->assertFalse($response->json('data.is_correct'));
        // Even wrong, the correct answer and explanation are still
        // revealed — that's the whole point of a practice question.
        $this->assertSame(0, $response->json('data.correct_option'));
    }

    public function test_selected_option_must_be_within_the_four_option_range(): void
    {
        $question = $this->makeQuestion();

        $this->actingAs($this->student())
            ->postJson("/api/ai-practice/questions/{$question->id}/answer", ['selected_option' => 7])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('selected_option');
    }

    /**
     * Beyond just the correct_option reveal — a fresh fetch also needs to
     * tell the caller what *this student* actually answered and whether
     * it was right, not just what the right answer is. Progress.tsx's
     * "Recent Practice" score has nothing else to compute from.
     */
    public function test_a_fresh_fetch_reveals_my_own_answer_and_whether_it_was_correct(): void
    {
        $question = $this->makeQuestion();
        $student = $question->set->user;

        $this->actingAs($student)
            ->postJson("/api/ai-practice/questions/{$question->id}/answer", ['selected_option' => 2]);

        $response = $this->actingAs($student)->getJson('/api/ai-practice/sets');

        $response->assertOk();
        $this->assertSame(2, $response->json('data.0.questions.0.my_selected_option'));
        $this->assertFalse($response->json('data.0.questions.0.my_answer_correct'));
    }

    public function test_after_answering_a_fresh_fetch_of_the_set_reveals_the_answer(): void
    {
        $question = $this->makeQuestion();
        $student = $question->set->user;

        $this->actingAs($student)
            ->postJson("/api/ai-practice/questions/{$question->id}/answer", ['selected_option' => 0]);

        $response = $this->actingAs($student)->getJson('/api/ai-practice/sets');

        $response->assertOk();
        $this->assertSame(0, $response->json('data.0.questions.0.correct_option'));
    }

    public function test_a_different_students_answer_does_not_reveal_the_question_to_others(): void
    {
        $question = $this->makeQuestion();
        $otherStudent = $this->student();

        $this->actingAs($otherStudent)
            ->postJson("/api/ai-practice/questions/{$question->id}/answer", ['selected_option' => 0]);

        // The question's own owner hasn't answered it themselves — their
        // view of their own set should still hide correct_option.
        $response = $this->actingAs($question->set->user)->getJson('/api/ai-practice/sets');

        $this->assertArrayNotHasKey('correct_option', $response->json('data.0.questions.0'));
    }
}
