import { apiGet, apiPost, ensureCsrfCookie } from "./api";
import { ApiError } from "../types/common";
import type { AuthUser } from "../types/auth";

/**
 * Replaces the old Bearer-token-via-URL-handoff flow from the previous
 * (non-Clinova) version of this template — that pattern assumed three
 * separate subdomains sharing a login. Clinova's admin console is a single
 * standalone app, authenticated the way api/docs/API_REFERENCE.md §2
 * describes: a session cookie, no token stored in JS anywhere.
 */

export async function login(email: string, password: string): Promise<void> {
  await ensureCsrfCookie();

  try {
    await apiPost<void>("/login", { email, password });
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      // Covers both "wrong password" and the suspended-account message —
      // the caller renders whatever Laravel's validation message says
      // rather than this module deciding the wording.
      throw new Error(error.errors?.email?.[0] ?? error.message);
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await apiPost<void>("/logout");
}

/**
 * Returns null on 401 (not logged in) instead of throwing — "no one's
 * signed in" is an expected, routine state for this call, not an error
 * condition the caller needs to catch separately every time.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiGet<AuthUser>("/user");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
