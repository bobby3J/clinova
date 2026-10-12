<?php

namespace Tests\Feature\Flashcards;

use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\FlashcardDeck;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class FlashcardTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_students_can_list_cards_in_a_published_deck(): void
    {
        $deck = FlashcardDeck::factory()->published()->create();
        Flashcard::factory()->count(3)->create(['deck_id' => $deck->id]);

        $response = $this->actingAs($this->student())
            ->getJson("/api/flashcards/decks/{$deck->id}/cards");

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    /**
     * FlashcardController::index() authorizes against the parent deck's
     * 'view' ability — there's no Policy on Flashcard itself, a card's
     * visibility is entirely inherited from its deck's review status.
     */
    public function test_students_cannot_list_cards_in_a_draft_deck(): void
    {
        $deck = FlashcardDeck::factory()->create(); // draft
        Flashcard::factory()->create(['deck_id' => $deck->id]);

        $this->actingAs($this->student())
            ->getJson("/api/flashcards/decks/{$deck->id}/cards")
            ->assertForbidden();
    }

    public function test_students_cannot_add_a_card_to_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->published()->create();

        $this->actingAs($this->student())
            ->postJson('/api/flashcards/cards', [
                'deck_id' => $deck->id,
                'question' => 'Hacked question?',
                'answer' => 'Hacked answer.',
            ])
            ->assertForbidden();
    }

    /**
     * A FormRequest's authorize() runs BEFORE its rules() — so a
     * nonexistent deck_id hits StoreFlashcardRequest's null-guard
     * (`$deck !== null && ...`) first, not the exists:flashcard_decks,id
     * validation rule. This proves that guard actually resolves to a
     * clean 403, not a TypeError from handing null to the Policy — the
     * exact edge case that motivated writing it in the first place.
     */
    public function test_creating_a_card_with_an_invalid_deck_id_is_rejected_not_a_server_error(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/flashcards/cards', [
                'deck_id' => 999999,
                'question' => 'Orphan question?',
                'answer' => 'Orphan answer.',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_add_a_card_to_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/flashcards/cards', [
                'deck_id' => $deck->id,
                'question' => 'Normal adult resting heart rate range?',
                'answer' => '60-100 beats per minute',
                'order' => 1,
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('flashcards', [
            'deck_id' => $deck->id,
            'question' => 'Normal adult resting heart rate range?',
        ]);
    }

    /**
     * Regression test for the same bug as TopicTest's equivalent — see
     * that test's docblock. Caught here first via manual curl
     * verification while wiring the frontend, which is what prompted the
     * audit that found Topic had it too.
     */
    public function test_creating_a_card_without_an_order_defaults_to_zero(): void
    {
        $deck = FlashcardDeck::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/flashcards/cards', [
                'deck_id' => $deck->id,
                'question' => 'No explicit order?',
                'answer' => 'Should default to 0.',
            ]);

        $response->assertCreated();
        $response->assertJsonPath('data.order', 0);
    }

    public function test_admin_can_update_a_card(): void
    {
        $card = Flashcard::factory()->create(['question' => 'Old question?']);

        $this->actingAs($this->admin())
            ->patchJson("/api/flashcards/cards/{$card->id}", ['question' => 'New question?'])
            ->assertOk();

        $this->assertDatabaseHas('flashcards', ['id' => $card->id, 'question' => 'New question?']);
    }

    public function test_students_cannot_update_a_card(): void
    {
        $card = Flashcard::factory()->create(['question' => 'Old question?']);

        $this->actingAs($this->student())
            ->patchJson("/api/flashcards/cards/{$card->id}", ['question' => 'Hacked question?'])
            ->assertForbidden();

        $this->assertDatabaseHas('flashcards', ['id' => $card->id, 'question' => 'Old question?']);
    }

    public function test_admin_can_delete_a_card(): void
    {
        $card = Flashcard::factory()->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/flashcards/cards/{$card->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('flashcards', ['id' => $card->id]);
    }

    public function test_students_cannot_delete_a_card(): void
    {
        $card = Flashcard::factory()->create();

        $this->actingAs($this->student())
            ->deleteJson("/api/flashcards/cards/{$card->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('flashcards', ['id' => $card->id]);
    }

    /**
     * See StudyLibrary\SubjectTest's equivalent — same reasoning. The
     * description truncates the question (Str::limit, 50 chars) since a
     * card has no title field to log instead.
     */
    public function test_deleting_a_card_creates_an_activity_log_entry(): void
    {
        $admin = $this->admin();
        $card = Flashcard::factory()->create(['question' => 'What is the normal fetal heart rate range?']);

        $this->actingAs($admin)
            ->deleteJson("/api/flashcards/cards/{$card->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'deleted_flashcard',
            'subject_type' => (new Flashcard)->getMorphClass(),
            'subject_id' => $card->id,
            'description' => 'Deleted flashcard "What is the normal fetal heart rate range?"',
        ]);
    }
}
