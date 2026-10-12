import { apiGet, apiPut } from "./api";
import type { ApiResponse } from "../types/common";
import type { UserSettings } from "../types/settings";

export function getSettings() {
  return apiGet<ApiResponse<UserSettings>>("/user/settings");
}

export function updateSettings(payload: Partial<UserSettings>) {
  return apiPut<ApiResponse<UserSettings>>("/user/settings", payload);
}
