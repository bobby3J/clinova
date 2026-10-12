import type { Track } from "./common";

/**
 * Matches BroadcastAnnouncementRequest::rules() exactly
 * (api/app/Domain/Admin/Http/Requests/BroadcastAnnouncementRequest.php).
 * There is no list/history endpoint for announcements — this is the only
 * shape this domain has. See src/lib/announcements.ts's top comment.
 */
export interface BroadcastAnnouncementPayload {
  title: string;
  body: string;
  track?: Track | null;
  level?: string | null;
}

/** What POST /admin/announcements actually returns — see ApiResponse::success() in the controller. */
export interface BroadcastAnnouncementResult {
  recipient_count: number;
}

/**
 * ApiResponse<T> (src/types/common.ts) is just `{ data: T }` — this
 * endpoint also sends a `message` ("Announcement sent."), which
 * AnnouncementController passes as success()'s second argument. Worth
 * showing in the UI, so it gets its own response type instead of being
 * silently dropped by the generic one.
 */
export interface BroadcastAnnouncementResponse {
  data: BroadcastAnnouncementResult;
  message: string;
}
