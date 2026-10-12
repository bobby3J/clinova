<?php

namespace App\Domain\Flashcards\Policies;

use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\Users\Models\User;

/**
 * Same shape as StudyMaterialPolicy — same review workflow, same rule
 * (published-or-admin to view, admin-only to write). Kept as its own class
 * rather than reused/shared, because FlashcardDeck and StudyMaterial are
 * different models with no inheritance relationship; Laravel's policy
 * resolution is per-model, not per-workflow.
 */
class FlashcardDeckPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, FlashcardDeck $deck): bool
    {
        return $deck->status === ContentStatus::Published
            || $user->canManageStudyContent();
    }

    public function create(User $user): bool
    {
        return $user->canManageStudyContent();
    }

    public function update(User $user, FlashcardDeck $deck): bool
    {
        return $user->canManageStudyContent();
    }

    public function delete(User $user, FlashcardDeck $deck): bool
    {
        return $user->canManageStudyContent();
    }

    public function publish(User $user, FlashcardDeck $deck): bool
    {
        return $user->canManageStudyContent();
    }
}
