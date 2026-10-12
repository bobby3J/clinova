/**
 * Matches NotificationController::index()'s shape exactly
 * (api/app/Domain/Users/Http/Controllers/NotificationController.php) —
 * reads the student's own rows in Laravel's built-in notifications table,
 * populated today only by admin's broadcast-announcement feature.
 */
export interface AppNotification {
  id: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsResponse {
  data: AppNotification[];
  meta: { unread_count: number };
}
