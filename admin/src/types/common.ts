/**
 * Mirrors api/docs/API_REFERENCE.md exactly — that doc is the source of
 * truth (pulled from the real backend code, not memory). If this file and
 * that doc ever disagree, the doc is what to trust and this file is what's
 * stale.
 */

export type Track = "nursing" | "midwifery";
export type ContentStatus = "draft" | "in_review" | "published";
export type MaterialType = "note" | "video" | "audio" | "tip";
export type ProgressStatus = "new" | "learning" | "mastered";
export type SessionType = "focus" | "break";

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
}

/**
 * The shape Laravel's API Resources produce automatically when
 * Resource::collection() is handed a paginator (->paginate()) instead of
 * a plain Collection (->get()) — e.g. GET /admin/activity-log,
 * GET /admin/users. Confirmed against the real response, not assumed from
 * Laravel's docs: `links` has first/last/prev/next URLs, `meta` carries
 * current_page/last_page/per_page/total (plus a per-page-number `links`
 * array this app doesn't currently use — simple Previous/Next controls
 * only need current_page/last_page).
 */
export interface ApiPaginatedResponse<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

/** Thrown by the API client on any non-2xx response — see lib/api.ts. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
