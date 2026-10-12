<?php

namespace App\Domain\Admin\Listeners;

use App\Domain\Admin\Models\AdminActivityLog;
use App\Domain\Shared\Events\AdminActionPerformed;

/**
 * Auto-discovered the same way UpdateStreakOnSessionCompleted was — this is
 * the class PublishStudyMaterialAction's and PublishFlashcardDeckAction's
 * comments promised back when Admin didn't exist yet. Neither of those
 * Actions needed to change to make this work; they'll fire
 * AdminActionPerformed and this listener just starts existing.
 */
class LogAdminActivity
{
    public function handle(AdminActionPerformed $event): void
    {
        AdminActivityLog::create([
            'admin_id' => $event->admin->id,
            'action' => $event->action,
            'subject_type' => $event->subject?->getMorphClass(),
            'subject_id' => $event->subject?->getKey(),
            'description' => $event->description,
        ]);
    }
}
