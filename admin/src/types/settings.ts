/**
 * Matches UpdatePasswordRequest::rules() exactly
 * (api/app/Domain/Users/Http/Requests/UpdatePasswordRequest.php).
 * PUT /user/password — the authenticated "change my own password" flow,
 * distinct from the guest forgot-password-via-email flow auth.ts already
 * wraps. Returns 204 No Content on success.
 */
export interface UpdatePasswordPayload {
  current_password: string;
  password: string;
  password_confirmation: string;
}
