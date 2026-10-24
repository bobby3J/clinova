<?php

namespace App\Domain\Support\Notifications;

use App\Domain\Support\Models\SupportTicket;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Str;

/**
 * Sent to a student only when an *admin* replies to their ticket — a
 * student replying to their own ticket doesn't notify themselves. Reuses
 * the exact same database-notifications pipeline AnnouncementNotification
 * already established (NotificationController, NotificationBell on the
 * frontend) — this is the only new file that mechanism needed; nothing
 * about how notifications are listed, counted, or marked read changes.
 */
class SupportTicketReplyNotification extends Notification
{
    public function __construct(
        public readonly SupportTicket $ticket,
        public readonly string $messageBody,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => 'Reply to "'.$this->ticket->subject.'"',
            // Truncated — this is a notification-list preview, not the
            // message itself; the full body is read from the ticket
            // thread (GET /support/tickets/{id}) when the student taps in.
            'body' => Str::limit($this->messageBody, 140),
            'support_ticket_id' => $this->ticket->id,
        ];
    }
}
