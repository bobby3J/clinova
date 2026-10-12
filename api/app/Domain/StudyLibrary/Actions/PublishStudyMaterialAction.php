<?php

namespace App\Domain\StudyLibrary\Actions;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

/**
 * Moves a StudyMaterial from draft/in_review into published, which is what
 * actually makes it appear in the student-facing Study Library (see the
 * visibleToStudents() scope on the model).
 *
 * Deliberately its own Action rather than an inline $material->update() in
 * the controller: publishing is a state transition, not a field edit. The
 * AdminActionPerformed event at the bottom is the promise made back when
 * Admin didn't exist yet, now actually kept — StudyLibrary still has no
 * idea Admin exists, it just fires a shared event.
 */
class PublishStudyMaterialAction extends Action
{
    public function handle(User $admin, StudyMaterial $material): StudyMaterial
    {
        $material->update([
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);

        event(new AdminActionPerformed(
            admin: $admin,
            action: 'published_study_material',
            subject: $material,
            description: "Published \"{$material->title}\"",
        ));

        return $material;
    }
}
