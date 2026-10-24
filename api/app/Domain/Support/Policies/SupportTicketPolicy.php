<?php

namespace App\Domain\Support\Policies;

use App\Domain\Support\Models\SupportTicket;
use App\Domain\Users\Models\User;

/**
 * A student owns their own tickets; an admin owns none but can act on
 * all of them (no "assigned admin" concept — see SupportTicket's own
 * docblock). Unlike StudyMaterialPolicy, there's no "lecturer" case at
 * all here — support is a student <-> admin channel only.
 */
class SupportTicketPolicy
{
    /**
     * A student replying to, or viewing the thread on, their own ticket;
     * or an admin doing the same to anyone's. Same rule for both
     * view() and reply() — reading a thread and adding to it carry the
     * same ownership requirement here, unlike StudyMaterial's
     * view-vs-edit split.
     */
    public function view(User $user, SupportTicket $ticket): bool
    {
        return $ticket->user_id === $user->id || $user->hasRole('admin');
    }

    public function reply(User $user, SupportTicket $ticket): bool
    {
        return $this->view($user, $ticket);
    }

    /**
     * Status changes (open -> in_progress -> resolved) are an admin
     * judgment call on the ticket's resolution state, not something the
     * student who filed it drives directly — same reasoning
     * StudyMaterialPolicy's publish() documents for a different domain.
     */
    public function updateStatus(User $user, SupportTicket $ticket): bool
    {
        return $user->hasRole('admin');
    }
}
