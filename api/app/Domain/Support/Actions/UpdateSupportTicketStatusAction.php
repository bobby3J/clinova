<?php

namespace App\Domain\Support\Actions;

use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Models\SupportTicket;
use App\Support\Actions\Action;

/**
 * Deliberately just a status flip — no notification fires here (unlike a
 * reply). Marking a ticket "resolved" with no accompanying message isn't
 * something a student needs pushed to them the way an actual reply is;
 * if an admin wants the student to know *why* it's resolved, that's what
 * a reply message is for, via ReplyToSupportTicketAction.
 */
class UpdateSupportTicketStatusAction extends Action
{
    public function handle(SupportTicket $ticket, TicketStatus $status): SupportTicket
    {
        $ticket->update(['status' => $status]);

        return $ticket;
    }
}
