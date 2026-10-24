<?php

namespace App\Domain\Support\Models;

use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One message in a ticket's thread — authored by either the student who
 * opened the ticket or an admin replying to it. Append-only, same honest-
 * log shape as AiPracticeAnswer/StudySession: nothing here is ever edited
 * or deleted after the fact, so the thread a student sees is always
 * exactly what was said, in order.
 */
#[Fillable(['support_ticket_id', 'user_id', 'body'])]
class SupportTicketMessage extends Model
{
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'support_ticket_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
