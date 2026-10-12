/**
 * Mirrors api/docs/API_REFERENCE.md exactly — that doc is the source of
 * truth (pulled from the real backend code, not memory). If this file and
 * that doc ever disagree, the doc is what to trust and this file is what's
 * stale. Copied from admin/src/types/common.ts, trimmed to only what this
 * app actually calls (no pagination types — GET /study-sessions and
 * GET /sounds are both unpaginated).
 */

export type Track = "nursing" | "midwifery";

export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
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
