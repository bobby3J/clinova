<?php

namespace App\Domain\Shared\Events;

use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * Fired by any domain's Action after an admin does something worth
 * auditing — publishing content, suspending a user, broadcasting an
 * announcement. One shared event instead of a bespoke one per action
 * (StudyMaterialPublished, FlashcardDeckPublished, UserSuspended, ...)
 * because "an admin did X to Y" is a structural concept every domain needs
 * the same shape for, not a domain-specific business event like
 * FocusSessionCompleted. Lives in Shared for the same reason Track and
 * ContentStatus do: genuinely used by more than one domain, not a
 * dumping ground.
 *
 * $subject is nullable because not every logged action has a single model
 * it acted on (broadcasting an announcement touches many users at once,
 * not one).
 */
class AdminActionPerformed
{
    public function __construct(
        public readonly User $admin,
        public readonly string $action,
        public readonly ?Model $subject = null,
        public readonly ?string $description = null,
    ) {}
}
