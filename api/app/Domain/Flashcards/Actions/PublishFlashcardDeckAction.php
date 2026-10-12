<?php

namespace App\Domain\Flashcards\Actions;

use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

/**
 * Mirrors PublishStudyMaterialAction, minus a published_at stamp —
 * flashcard_decks has no such column (checked the migration before writing
 * this, not assumed from the StudyMaterial pattern) — same
 * AdminActionPerformed event at the end, though.
 */
class PublishFlashcardDeckAction extends Action
{
    public function handle(User $admin, FlashcardDeck $deck): FlashcardDeck
    {
        $deck->update([
            'status' => ContentStatus::Published,
        ]);

        event(new AdminActionPerformed(
            admin: $admin,
            action: 'published_flashcard_deck',
            subject: $deck,
            description: "Published deck \"{$deck->title}\"",
        ));

        return $deck;
    }
}
