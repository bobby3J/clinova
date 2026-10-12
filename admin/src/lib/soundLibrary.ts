import { apiGet, apiPatch, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type {
  CreateSoundPayload,
  Sound,
  UpdateSoundPayload,
} from "../types/soundLibrary";

/** One function per SoundLibrary endpoint — see api/docs/API_REFERENCE.md §SoundLibrary. */

/** Flat list, no pagination — admins get inactive sounds too, students don't (server-side filter). */
export function getSounds() {
  return apiGet<ApiListResponse<Sound>>("/sounds");
}

export function createSound(payload: CreateSoundPayload) {
  return apiPost<ApiResponse<Sound>>("/sounds", payload);
}

export function updateSound(id: number, payload: UpdateSoundPayload) {
  return apiPatch<ApiResponse<Sound>>(`/sounds/${id}`, payload);
}

/**
 * Same endpoints as createSound/updateSound, just a multipart body instead
 * of JSON — for when the admin uploads a file instead of pasting a URL.
 * apiFetch (src/lib/api.ts) detects the FormData and skips JSON-encoding
 * it; for the PATCH case it also handles Laravel's _method spoofing, since
 * a real PATCH with a file body never reaches PHP's $_FILES at all.
 */
export function createSoundWithFile(formData: FormData) {
  return apiPost<ApiResponse<Sound>>("/sounds", formData);
}

export function updateSoundWithFile(id: number, formData: FormData) {
  return apiPatch<ApiResponse<Sound>>(`/sounds/${id}`, formData);
}

export function activateSound(id: number) {
  return apiPatch<ApiResponse<Sound>>(`/sounds/${id}/activate`);
}

export function deactivateSound(id: number) {
  return apiPatch<ApiResponse<Sound>>(`/sounds/${id}/deactivate`);
}
