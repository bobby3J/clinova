<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

class SuspendUserAction extends Action
{
    public function handle(User $admin, User $target): User
    {
        $target->update(['suspended_at' => now()]);

        // Revokes every existing Sanctum token — kills any session they're
        // currently logged into. suspended_at itself is what stops them
        // logging back in afterward (see LoginRequest::authenticate()).
        $target->tokens()->delete();

        event(new AdminActionPerformed(
            admin: $admin,
            action: 'suspended_user',
            subject: $target,
            description: "Suspended {$target->name}",
        ));

        return $target;
    }
}
