<?php

namespace App\Domain\Admin\Actions;

use App\Domain\Admin\Notifications\AnnouncementNotification;
use App\Domain\Shared\Enums\Track;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;
use Illuminate\Support\Facades\Notification;

/**
 * Sheet 06: "Send announcement → push + in-app notification badge,
 * targeted by track and/or level." Only ever targets students — an admin
 * broadcasting doesn't need their own announcement to land in their own
 * notification bell.
 */
class BroadcastAnnouncementAction extends Action
{
    public function handle(User $admin, string $title, string $body, ?Track $track = null, ?string $level = null): int
    {
        $recipients = User::role('student')
            ->when($track, fn ($query) => $query->where('track', $track))
            ->when($level, fn ($query) => $query->where('level', $level))
            ->get();

        Notification::send($recipients, new AnnouncementNotification($title, $body));

        event(new AdminActionPerformed(
            admin: $admin,
            action: 'broadcast_announcement',
            description: "Broadcast \"{$title}\" to {$recipients->count()} student(s)",
        ));

        return $recipients->count();
    }
}
