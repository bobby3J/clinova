import { apiGet } from "./api";
import type { ApiListResponse, Track } from "../types/common";
import type { Subject, Topic, StudyMaterial } from "../types/studyLibrary";

/**
 * Read-only subset of admin/src/lib/studyLibrary.ts — this app never
 * creates/edits/publishes/deletes content, only browses what's already
 * published (the backend already filters drafts out for non-admins via
 * StudyMaterial::visibleToStudents(), nothing to replicate client-side).
 */

/** track is optional — omit it to see every subject regardless of track. */
export function getSubjects(track?: Track) {
  const query = track ? `?track=${track}` : "";
  return apiGet<ApiListResponse<Subject>>(`/study-library/subjects${query}`);
}

export function getTopics(subjectId: number) {
  return apiGet<ApiListResponse<Topic>>(
    `/study-library/topics?subject_id=${subjectId}`,
  );
}

export function getTopicMaterials(topicId: number) {
  return apiGet<ApiListResponse<StudyMaterial>>(
    `/study-library/topics/${topicId}/materials`,
  );
}
