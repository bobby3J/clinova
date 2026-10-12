import { apiGet, apiPatch, apiPost } from "./api";
import type { ApiPaginatedResponse, ApiResponse } from "../types/common";
import type { AdminUser } from "../types/users";

/**
 * Reuses AdminUser/ApiPaginatedResponse rather than a new type file — the
 * backend's LecturerManagementController reuses the exact same
 * AdminUserResource UserManagementController does, so the shape is
 * identical (a lecturer's `roles` array just says ["lecturer"] instead of
 * ["student"]). See src/lib/users.ts for the sibling student version of
 * every function here.
 */
export function getLecturers(page = 1) {
  return apiGet<ApiPaginatedResponse<AdminUser>>(`/admin/lecturers?page=${page}`);
}

export type CreateLecturerPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export function createLecturer(payload: CreateLecturerPayload) {
  return apiPost<ApiResponse<AdminUser>>("/admin/lecturers", payload);
}

export function suspendLecturer(id: number) {
  return apiPatch<ApiResponse<AdminUser>>(`/admin/lecturers/${id}/suspend`);
}

export function reactivateLecturer(id: number) {
  return apiPatch<ApiResponse<AdminUser>>(`/admin/lecturers/${id}/reactivate`);
}
