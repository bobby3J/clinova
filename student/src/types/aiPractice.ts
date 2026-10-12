/**
 * Matches AiPracticeSetResource/AiPracticeQuestionResource/
 * AiPracticeAnswerResource exactly (api/app/Domain/AiPractice/Http/Resources/).
 * correct_option/explanation are only present on a question once the
 * requesting student has actually answered it — absent entirely
 * beforehand, not null (same conditional-field convention as
 * StudyMaterialResource's admin-only fields elsewhere in this app).
 */
export interface PracticeQuestion {
  id: number;
  question: string;
  options: string[];
  order: number;
  correct_option?: number;
  explanation?: string | null;
  /** What *this* student selected, and whether it was right — both only
   * present once they've actually answered (same gating as correct_option). */
  my_selected_option?: number;
  my_answer_correct?: boolean;
}

export interface PracticeSet {
  id: number;
  topic_id: number;
  topic_name: string | null;
  created_at: string;
  questions: PracticeQuestion[];
}

export interface PracticeAnswer {
  question_id: number;
  selected_option: number;
  is_correct: boolean;
  correct_option: number;
  explanation: string | null;
}
