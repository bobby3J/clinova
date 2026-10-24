<?php

namespace App\Domain\Support\Actions;

use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Models\SupportTicket;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;
use Illuminate\Support\Facades\DB;

/**
 * Opens a ticket and writes its first message in one step — from the
 * student's point of view there's no such thing as a ticket with no
 * message yet, so the API never exposes an intermediate state where one
 * exists without the other. Wrapped in a transaction for exactly that
 * reason: a failure writing the message must not leave an empty ticket
 * behind.
 */
class CreateSupportTicketAction extends Action
{
    public function handle(User $user, string $subject, ?string $category, string $message): SupportTicket
    {
        return DB::transaction(function () use ($user, $subject, $category, $message) {
            $ticket = SupportTicket::create([
                'user_id' => $user->id,
                'subject' => $subject,
                'category' => $category,
                // Set explicitly rather than left to the migration's DB
                // default — Model::create() doesn't reflect a DB-level
                // default back onto the in-memory instance it returns
                // (same gotcha ARCHITECTURE.md documents elsewhere), so
                // the resource serialized as status: null until this was
                // made explicit. Caught by this Action's own test.
                'status' => TicketStatus::Open,
            ]);

            $ticket->messages()->create([
                'user_id' => $user->id,
                'body' => $message,
            ]);

            return $ticket->load('messages');
        });
    }
}
