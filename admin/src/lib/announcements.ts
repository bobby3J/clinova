import { apiPost } from "./api";
import type {
  BroadcastAnnouncementPayload,
  BroadcastAnnouncementResponse,
} from "../types/announcements";

/**
 * POST /admin/announcements — the only endpoint this domain has. No list,
 * no history, no GET at all; announcements are fire-and-forget database
 * notifications written directly to each matching student's own
 * notifications table, not stored anywhere an admin can query back later.
 * See api/docs/ARCHITECTURE.md for why (Laravel's built-in notifications
 * table, a deliberate deviation from the original ERD).
 */
export function sendAnnouncement(payload: BroadcastAnnouncementPayload) {
  return apiPost<BroadcastAnnouncementResponse>(
    "/admin/announcements",
    payload,
  );
}
