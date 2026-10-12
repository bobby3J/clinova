import { apiGet, apiPost, ensureCsrfCookie } from "./api";
import { ApiError } from "../types/common";
import type { AuthUser } from "../types/auth";

/**
 * Same Sanctum cookie-session flow as admin/src/lib/auth.ts — no token
 * stored in JS anywhere. The /login, /logout, /user endpoints are generic
 * across roles; nothing here is student-specific.
 */

/**
 * POST /register — the backend assigns the 'student' role automatically
 * (RegisteredUserController::store(), fixed 2026-10-06 — this endpoint is
 * only ever reached from here, never from the admin console). Auth::login()
 * runs server-side on success, same as /login, so the caller should do the
 * same second-round-trip getCurrentUser() AuthContext's login() does.
 *
 * Unlike login(), a 422 here is NOT collapsed into a single Error — there
 * are several independently-failable fields (name, email uniqueness,
 * password confirmation), so the ApiError's .errors object is left intact
 * for the caller to render per-field, same convention as every create-form
 * modal in the admin console.
 */
export async function register(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string,
): Promise<void> {
  await ensureCsrfCookie();
  await apiPost<void>("/register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
}

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
