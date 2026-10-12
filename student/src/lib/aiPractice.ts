import { apiGet, apiPost } from "./api";
import type { ApiListResponse, ApiResponse } from "../types/common";
import type { PracticeAnswer, PracticeSet } from "../types/aiPractice";

/** GET /ai-practice/sets — the caller's own practice history, newest first. */
export function getPracticeHistory() {
  return apiGet<ApiListResponse<PracticeSet>>("/ai-practice/sets");
}

/**
 * POST /ai-practice/sets — 422s if the topic has no published materials
 * yet (surfaced via ApiError.errors.topic_id by the caller).
 */
export function generatePracticeSet(topicId: number) {
  return apiPost<ApiResponse<PracticeSet>>("/ai-practice/sets", { topic_id: topicId });
}

export function answerPracticeQuestion(questionId: number, selectedOption: number) {
  return apiPost<ApiResponse<PracticeAnswer>>(
    `/ai-practice/questions/${questionId}/answer`,
    { selected_option: selectedOption },
  );
}
