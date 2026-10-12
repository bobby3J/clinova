<?php

namespace App\Domain\StudyLibrary\Policies;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\Users\Models\User;

/**
 * Answers exactly one question per method: "is $user allowed to do this to
 * $material?" Nothing here touches the database beyond reading attributes
 * already on the models it's given — a Policy checks, it never fetches.
 *
 * Laravel finds this class automatically for StudyMaterial (see the Gate
 * lookup we just verified) — nothing to register in a provider.
 */
class StudyMaterialPolicy
{
    /**
     * Everyone signed in can browse the library — the actual filtering of
     * *which* materials they see (published only, unless admin) happens in
     * the controller via the visibleToStudents() scope, not here.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * A single material is visible if it's published, or if the viewer can
     * manage study content at all (admin or lecturer — either needs to see
     * drafts to review/edit them).
     */
    public function view(User $user, StudyMaterial $material): bool
    {
        return $material->status === \App\Domain\Shared\Enums\ContentStatus::Published
            || $user->canManageStudyContent();
    }

    public function create(User $user): bool
    {
        return $user->canManageStudyContent();
    }

    public function update(User $user, StudyMaterial $material): bool
    {
        return $user->canManageStudyContent();
    }

    public function delete(User $user, StudyMaterial $material): bool
    {
        return $user->canManageStudyContent();
    }

    /**
     * Not one of Laravel's default CRUD ability names — Policies can define
     * any method name, and $this->authorize('publish', $material) in a
     * controller will call this one. Kept separate from update() because
     * "can edit the title" and "can move this into the published state
     * students see" are different permissions in a real newsroom-style
     * review workflow, even though both currently check the same roles.
     */
    public function publish(User $user, StudyMaterial $material): bool
    {
        return $user->canManageStudyContent();
    }
}
