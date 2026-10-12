<?php

namespace App\Domain\StudySessions\Policies;

use App\Domain\StudySessions\Models\StudySession;
use App\Domain\Users\Models\User;

/**
 * Every other Policy in this codebase so far has checked a role
 * ("is this user an admin?"). This one doesn't — a study session has no
 * admin concept at all, it's purely personal. The check is ownership:
 * does this session belong to the user making the request? Same Policy
 * mechanism, different kind of rule — worth noticing they're not the same
 * thing just because both happen to live in a class called *Policy.
 */
class StudySessionPolicy
{
    public function view(User $user, StudySession $session): bool
    {
        return $session->user_id === $user->id;
    }

    public function update(User $user, StudySession $session): bool
    {
        return $session->user_id === $user->id;
    }
}
