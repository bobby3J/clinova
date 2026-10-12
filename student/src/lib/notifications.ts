import { apiGet, apiPost } from "./api";
import type { NotificationsResponse } from "../types/notifications";

export function getNotifications() {
  return apiGet<NotificationsResponse>("/notifications");
}

export function markAllNotificationsRead() {
  return apiPost<void>("/notifications/mark-all-read");
}
