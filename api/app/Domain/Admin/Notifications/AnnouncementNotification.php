<?php

namespace App\Domain\Admin\Notifications;

use Illuminate\Notifications\Notification;

/**
 * Uses Laravel's built-in notifications table (see ARCHITECTURE.md — this
 * was a deliberate deviation from the original ERD sketch, which had a
 * custom notifications table). 'database' channel only for now; adding
 * 'mail' later is a one-line change to via(), not a new table.
 */
class AnnouncementNotification extends Notification
{
    public function __construct(
        public readonly string $title,
        public readonly string $body,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'title' => $this->title,
            'body' => $this->body,
        ];
    }
}
