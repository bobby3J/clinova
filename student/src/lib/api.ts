import { ApiError } from "../types/common";

/**
 * The Sanctum SPA flow this implements is documented in full in
 * api/docs/API_REFERENCE.md §2 and api/docs/ARCHITECTURE.md — read those
 * before changing anything here, especially VITE_API_ORIGIN vs
 * VITE_API_URL, which exist as two separate values on purpose (the
 * CSRF-cookie endpoint isn't under /api). Copied verbatim from
 * admin/src/lib/api.ts — this mechanism is role-agnostic, nothing here
 * needed to change for a student-facing app.
 */
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? "http://localhost:8000";

/**
 * Reads the XSRF-TOKEN cookie Laravel sets after /sanctum/csrf-cookie.
 * Axios has withXSRFToken to do this automatically; plain fetch doesn't,
 * so it's done by hand here. The cookie value is URL-encoded by Laravel —
 * decodeURIComponent is required or the token simply won't match what the
 * server expects.
 */
function readXsrfTokenCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Must be called once before the first state-changing request in a
 * session (login, or any POST/PATCH/DELETE if a cookie hasn't been
 * fetched yet) — this is what makes Sanctum treat the request as coming
 * from a trusted frontend at all. Safe to call more than once; it just
 * refreshes the cookie.
 */
export async function ensureCsrfCookie(): Promise<void> {
  await fetch(`${API_ORIGIN}/sanctum/csrf-cookie`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

/**
 * The one function every API call in this app goes through. Handles:
 * - credentials: 'include' (sends/receives the session + XSRF cookies)
 * - JSON body serialization
 * - the X-XSRF-TOKEN header for any non-GET request
 * - turning a non-2xx response into a typed ApiError instead of a response
 *   object the caller has to remember to check .ok on
 * - 204 No Content (login/logout) returning undefined instead of trying
 *   to parse an empty body as JSON
 */
export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isMutating = method !== "GET" && method !== "HEAD";

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  if (isMutating) {
    const xsrfToken = readXsrfTokenCookie();
    if (xsrfToken) {
      headers["X-XSRF-TOKEN"] = xsrfToken;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message ?? `Request failed with status ${response.status}`,
      response.status,
      data?.errors,
    );
  }

  return data as T;
}

export const apiGet = <T>(path: string) => apiFetch<T>(path);

export const apiPost = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "POST", body });

export const apiPatch = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "PATCH", body });

export const apiPut = <T>(path: string, body?: unknown) =>
  apiFetch<T>(path, { method: "PUT", body });
