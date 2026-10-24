/**
 * Matches NotificationController::index()'s shape exactly
 * (api/app/Domain/Users/Http/Controllers/NotificationController.php) —
 * reads the student's own rows in Laravel's built-in notifications table,
 * populated by admin's broadcast-announcement feature and (since the
 * support system) SupportTicketReplyNotification.
 */
export interface AppNotification {
  id: string;
  title: string | null;
  body: string | null;
  /** Present only on a support-reply notification — null on every other
   * kind (e.g. an announcement), which has nowhere to deep-link to. */
  support_ticket_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { unread_count: number };
}
