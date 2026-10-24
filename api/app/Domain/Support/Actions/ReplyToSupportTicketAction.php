<?php

namespace App\Domain\Support\Actions;

use App\Domain\Support\Models\SupportTicket;
use App\Domain\Support\Models\SupportTicketMessage;
use App\Domain\Support\Notifications\SupportTicketReplyNotification;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

/**
 * Handles a reply from *either* side of the conversation — the author's
 * own role decides what happens next, not a separate "which endpoint was
 * hit" flag. A student can reply to their own ticket (no notification: no
 * one needs telling about their own message); an admin's reply fires
 * SupportTicketReplyNotification so the student actually finds out
 * without having to keep revisiting the ticket to check.
 */
class ReplyToSupportTicketAction extends Action
{
    public function handle(User $author, SupportTicket $ticket, string $message): SupportTicketMessage
    {
        $reply = $ticket->messages()->create([
            'user_id' => $author->id,
            'body' => $message,
        ]);

        if ($author->hasRole('admin')) {
            $ticket->user->notify(new SupportTicketReplyNotification($ticket, $message));
        }

        return $reply;
    }
}
