import { apiDelete, apiGet, apiPatch, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type {
  CreateStudyMaterialPayload,
  CreateSubjectPayload,
  CreateTopicPayload,
  Subject,
  StudyMaterial,
  Topic,
  UpdateStudyMaterialPayload,
  UpdateSubjectPayload,
  UpdateTopicPayload,
} from "../types/studyLibrary";

/**
 * One function per StudyLibrary endpoint — see
 * api/docs/API_REFERENCE.md §StudyLibrary for the contract. Pages call
 * these instead of spelling out apiGet<...>("/study-library/...") inline,
 * so there's exactly one place to update if a path ever changes, and one
 * place a new page can find the right call instead of re-deriving it from
 * the docs each time.
 */

export function getSubjects() {
  return apiGet<ApiListResponse<Subject>>("/study-library/subjects");
}

export function createSubject(payload: CreateSubjectPayload) {
  return apiPost<ApiResponse<Subject>>("/study-library/subjects", payload);
}

export function updateSubject(id: number, payload: UpdateSubjectPayload) {
  return apiPatch<ApiResponse<Subject>>(
    `/study-library/subjects/${id}`,
    payload,
  );
}

/** Cascades to the subject's topics and their materials — see the backend comment. */
export function deleteSubject(id: number) {
  return apiDelete<void>(`/study-library/subjects/${id}`);
}

export function getTopics(subjectId: number) {
  return apiGet<ApiListResponse<Topic>>(
    `/study-library/topics?subject_id=${subjectId}`,
  );
}

export function createTopic(payload: CreateTopicPayload) {
  return apiPost<ApiResponse<Topic>>("/study-library/topics", payload);
}

export function updateTopic(id: number, payload: UpdateTopicPayload) {
  return apiPatch<ApiResponse<Topic>>(`/study-library/topics/${id}`, payload);
}

/** Cascades to the topic's materials — see the backend comment. */
export function deleteTopic(id: number) {
  return apiDelete<void>(`/study-library/topics/${id}`);
}

export function getTopicMaterials(topicId: number) {
  return apiGet<ApiListResponse<StudyMaterial>>(
    `/study-library/topics/${topicId}/materials`,
  );
}

// FormData, not just the typed payload — Slides materials upload a real
// file (apiFetch already handles FormData vs JSON transparently, see
// lib/api.ts), the other four types still send plain JSON.
export function createMaterial(
  payload: CreateStudyMaterialPayload | FormData,
) {
  return apiPost<ApiResponse<StudyMaterial>>(
    "/study-library/materials",
    payload,
  );
}

export function updateMaterial(
  id: number,
  payload: UpdateStudyMaterialPayload | FormData,
) {
  return apiPatch<ApiResponse<StudyMaterial>>(
    `/study-library/materials/${id}`,
    payload,
  );
}

export function publishMaterial(id: number) {
  return apiPost<ApiResponse<StudyMaterial>>(
    `/study-library/materials/${id}/publish`,
  );
}

export function deleteMaterial(id: number) {
  return apiDelete<void>(`/study-library/materials/${id}`);
}
