<?php

namespace Tests\Feature\Flashcards;

use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Flashcards\Models\UserFlashcardProgress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class FlashcardReviewTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_a_never_reviewed_card_is_due(): void
    {
        $deck = FlashcardDeck::factory()->published()->create();
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        $response = $this->actingAs($this->student())->getJson('/api/flashcards/due');

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertSame($card->id, $response->json('data.0.id'));
    }

    public function test_a_card_not_yet_due_is_excluded(): void
    {
        $student = $this->student();
        $deck = FlashcardDeck::factory()->published()->create();
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        UserFlashcardProgress::factory()->create([
            'user_id' => $student->id,
            'flashcard_id' => $card->id,
            'next_review_at' => now()->addDays(5),
        ]);

        $response = $this->actingAs($student)->getJson('/api/flashcards/due');

        $response->assertOk();
        $this->assertCount(0, $response->json('data'));
    }

    public function test_cards_in_a_draft_deck_are_never_due(): void
    {
        $deck = FlashcardDeck::factory()->create(); // draft, not published
        Flashcard::factory()->create(['deck_id' => $deck->id]);

        $response = $this->actingAs($this->student())->getJson('/api/flashcards/due');

        $this->assertCount(0, $response->json('data'));
    }

    /**
     * The exact SM-2 first-review case we traced by hand with curl while
     * building this domain: quality 5 on a brand-new card should land on
     * interval_days=1, ease_factor=2.6 (2.5 + 0.1). If ReviewFlashcardAction's
     * firstOrCreate() ever loses its explicit defaults again (the bug we
     * actually hit that day), this goes back to interval_days=0,
     * ease_factor=1.3 and fails immediately.
     */
    public function test_first_review_with_full_marks_sets_interval_to_one_day(): void
    {
        $student = $this->student();
        $deck = FlashcardDeck::factory()->published()->create();
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        $response = $this->actingAs($student)
            ->postJson("/api/flashcards/{$card->id}/review", ['quality' => 5]);

        // 201, not 200 — same wasRecentlyCreated mechanism from
        // StudyMaterialTest, here via ReviewFlashcardAction's
        // firstOrCreate(): this student has no prior progress on this
        // card, so the row is genuinely created, not just updated.
        $response->assertCreated();
        $response->assertJson([
            'data' => [
                'status' => 'learning',
                'ease_factor' => 2.6,
                'interval_days' => 1,
            ],
        ]);
    }

    public function test_a_failed_review_resets_interval_without_punishing_ease_factor(): void
    {
        $student = $this->student();
        $deck = FlashcardDeck::factory()->published()->create();
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        UserFlashcardProgress::factory()->create([
            'user_id' => $student->id,
            'flashcard_id' => $card->id,
            'ease_factor' => 2.8,
            'interval_days' => 16,
            'next_review_at' => now()->subMinute(),
        ]);

        $response = $this->actingAs($student)
            ->postJson("/api/flashcards/{$card->id}/review", ['quality' => 1]);

        $response->assertOk();
        $response->assertJson([
            'data' => [
                'status' => 'learning',
                'ease_factor' => 2.8, // unchanged — SM-2 only resets the interval on failure
                'interval_days' => 1,
            ],
        ]);
    }

    public function test_reviewing_a_card_in_a_draft_deck_is_blocked(): void
    {
        $deck = FlashcardDeck::factory()->create(); // draft
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        $this->actingAs($this->student())
            ->postJson("/api/flashcards/{$card->id}/review", ['quality' => 5])
            ->assertForbidden();
    }

    public function test_quality_must_be_within_sm2_scale(): void
    {
        $deck = FlashcardDeck::factory()->published()->create();
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        $this->actingAs($this->student())
            ->postJson("/api/flashcards/{$card->id}/review", ['quality' => 6])
            ->assertUnprocessable();
    }
}
