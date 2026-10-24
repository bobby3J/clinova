<?php

namespace App\Domain\Users\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Reads whatever's already in the authenticated user's own notifications
 * table — Laravel's built-in Notifiable trait, no new table. The only
 * writer today is BroadcastAnnouncementAction (AnnouncementNotification,
 * 'database' channel only). Unpaginated like StudySessions' index(): this
 * is "the one student's own rows," not a list that grows across users.
 */
class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        return [
            'data' => $user->notifications()
                ->latest()
                ->limit(50)
                ->get()
                ->map(fn ($n) => [
                    'id' => $n->id,
                    'title' => $n->data['title'] ?? null,
                    'body' => $n->data['body'] ?? null,
                    // Optional, present only on notifications that carry a
                    // deep link — today just SupportTicketReplyNotification
                    // (App\Domain\Support\Notifications). AnnouncementNotification's
                    // rows simply won't have this key, and the frontend
                    // treats it as optional rather than assuming every
                    // notification links somewhere.
                    'support_ticket_id' => $n->data['support_ticket_id'] ?? null,
                    'read_at' => $n->read_at,
                    'created_at' => $n->created_at,
                ]),
            'meta' => [
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ];
    }

    /**
     * Marks every unread notification as read in one query — called when
     * the student actually opens the notification panel, same "opening it
     * clears the badge" convention every real notification UI uses, not
     * a per-item toggle (there's no per-item UI yet to back that).
     */
    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->noContent();
    }
}
