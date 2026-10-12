import { apiPut } from "./api";
import type { UpdatePasswordPayload } from "../types/settings";

/** PUT /user/password — 204 on success, nothing to return. */
export function updatePassword(payload: UpdatePasswordPayload) {
  return apiPut<void>("/user/password", payload);
}
