<?php

namespace Tests\Feature\Flashcards;

use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class FlashcardDeckTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_students_only_see_published_decks(): void
    {
        FlashcardDeck::factory()->published()->count(2)->create();
        FlashcardDeck::factory()->create(); // stays draft

        $response = $this->actingAs($this->student())->getJson('/api/flashcards/decks');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_admins_see_draft_decks_too(): void
    {
        FlashcardDeck::factory()->published()->count(2)->create();
        FlashcardDeck::factory()->create();

        $response = $this->actingAs($this->admin())->getJson('/api/flashcards/decks');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_students_cannot_create_a_deck(): void
    {
        $this->actingAs($this->student())
            ->postJson('/api/flashcards/decks', [
                'topic_id' => Topic::factory()->create()->id,
                'title' => 'Hacked Deck',
            ])
            ->assertForbidden();
    }

    public function test_admin_can_create_a_deck_as_draft(): void
    {
        $topic = Topic::factory()->create();

        $response = $this->actingAs($this->admin())
            ->postJson('/api/flashcards/decks', [
                'topic_id' => $topic->id,
                'title' => 'Pharmacology Deck 4',
            ]);

        // 201 — same wasRecentlyCreated mechanism learned in StudyMaterialTest.
        $response->assertCreated();
        $this->assertDatabaseHas('flashcard_decks', [
            'title' => 'Pharmacology Deck 4',
            'status' => ContentStatus::Draft->value,
        ]);
    }

    /**
     * flashcard_decks has no published_at column (checked the migration
     * before writing PublishFlashcardDeckAction, not assumed) — this test
     * only checks status, deliberately not a published_at assertion that
     * would never pass.
     */
    public function test_publishing_a_deck_creates_an_activity_log_entry(): void
    {
        $admin = $this->admin();
        $deck = FlashcardDeck::factory()->create();

        $this->actingAs($admin)
            ->postJson("/api/flashcards/decks/{$deck->id}/publish")
            ->assertOk();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'published_flashcard_deck',
            'subject_type' => (new FlashcardDeck)->getMorphClass(),
            'subject_id' => $deck->id,
        ]);
        $this->assertTrue($deck->fresh()->status === ContentStatus::Published);
    }

    public function test_students_cannot_publish_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->create();

        $this->actingAs($this->student())
            ->postJson("/api/flashcards/decks/{$deck->id}/publish")
            ->assertForbidden();
    }

    public function test_admin_can_update_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->create(['title' => 'Old Title']);

        $this->actingAs($this->admin())
            ->patchJson("/api/flashcards/decks/{$deck->id}", ['title' => 'New Title'])
            ->assertOk();

        $this->assertDatabaseHas('flashcard_decks', ['id' => $deck->id, 'title' => 'New Title']);
    }

    public function test_students_cannot_update_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->create(['title' => 'Old Title']);

        $this->actingAs($this->student())
            ->patchJson("/api/flashcards/decks/{$deck->id}", ['title' => 'Hacked Title'])
            ->assertForbidden();

        $this->assertDatabaseHas('flashcard_decks', ['id' => $deck->id, 'title' => 'Old Title']);
    }

    public function test_admin_can_delete_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->create();

        $this->actingAs($this->admin())
            ->deleteJson("/api/flashcards/decks/{$deck->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('flashcard_decks', ['id' => $deck->id]);
    }

    public function test_students_cannot_delete_a_deck(): void
    {
        $deck = FlashcardDeck::factory()->create();

        $this->actingAs($this->student())
            ->deleteJson("/api/flashcards/decks/{$deck->id}")
            ->assertForbidden();

        $this->assertDatabaseHas('flashcard_decks', ['id' => $deck->id]);
    }

    public function test_deleting_a_deck_cascades_to_its_cards(): void
    {
        $deck = FlashcardDeck::factory()->create();
        $card = Flashcard::factory()->create(['deck_id' => $deck->id]);

        $this->actingAs($this->admin())
            ->deleteJson("/api/flashcards/decks/{$deck->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('flashcards', ['id' => $card->id]);
    }

    /** See StudyLibrary\SubjectTest's equivalent — same reasoning. */
    public function test_deleting_a_deck_creates_an_activity_log_entry(): void
    {
        $admin = $this->admin();
        $deck = FlashcardDeck::factory()->create(['title' => 'Neonatal Resuscitation']);

        $this->actingAs($admin)
            ->deleteJson("/api/flashcards/decks/{$deck->id}")
            ->assertNoContent();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'deleted_flashcard_deck',
            'subject_type' => (new FlashcardDeck)->getMorphClass(),
            'subject_id' => $deck->id,
            'description' => 'Deleted deck "Neonatal Resuscitation"',
        ]);
    }

    /** Same role-parity confirmation as SubjectTest::test_lecturer_can_create_a_subject(). */
    public function test_lecturer_can_create_and_publish_a_deck(): void
    {
        $topic = Topic::factory()->create();

        $createResponse = $this->actingAs($this->lecturer())
            ->postJson('/api/flashcards/decks', [
                'topic_id' => $topic->id,
                'title' => 'Lecturer Deck',
            ]);
        $createResponse->assertCreated();
        $deckId = $createResponse->json('data.id');

        $this->actingAs($this->lecturer())
            ->postJson("/api/flashcards/decks/{$deckId}/publish")
            ->assertOk();

        $this->assertDatabaseHas('flashcard_decks', [
            'id' => $deckId,
            'status' => ContentStatus::Published->value,
        ]);
    }
}
