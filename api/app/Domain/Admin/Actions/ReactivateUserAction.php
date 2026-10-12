<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

class ReactivateUserAction extends Action
{
    public function handle(User $admin, User $target): User
    {
        $target->update(['suspended_at' => null]);

        event(new AdminActionPerformed(
            admin: $admin,
            action: 'reactivated_user',
            subject: $target,
            description: "Reactivated {$target->name}",
        ));

        return $target;
    }
}
