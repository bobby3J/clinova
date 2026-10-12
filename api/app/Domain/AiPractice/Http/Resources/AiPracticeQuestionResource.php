<?php

namespace App\Domain\AiPractice\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\AiPractice\Models\AiPracticeQuestion
 *
 * correct_option/explanation/my_selected_option/my_answer_correct are all
 * withheld until the requesting user has actually answered this question
 * — same $this->when() conditional-field pattern StudyMaterialResource
 * already uses for admin-only fields, just gating on "already answered"
 * instead of "is an admin". Requires `answers` to be eager-loaded by the
 * caller, scoped to the requesting user (see PracticeSetController) — a
 * list of these resources would otherwise N+1 per question.
 *
 * my_selected_option/my_answer_correct matter beyond just UI nicety:
 * without them, a caller can tell what the *right* answer was but not
 * whether *this user* actually got it right — Progress.tsx's "Recent
 * Practice" score needed this and had nothing to compute it from until
 * these two fields were added.
 */
class AiPracticeQuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $userId = $request->user()?->id;
        $myAnswer = $userId
            ? ($this->relationLoaded('answers')
                ? $this->answers->where('user_id', $userId)->last()
                : $this->answers()->where('user_id', $userId)->latest()->first())
            : null;

        return [
            'id' => $this->id,
            'question' => $this->question,
            'options' => $this->options,
            'order' => $this->order,
            'correct_option' => $this->when($myAnswer !== null, $this->correct_option),
            'explanation' => $this->when($myAnswer !== null, $this->explanation),
            'my_selected_option' => $this->when($myAnswer !== null, $myAnswer?->selected_option),
            'my_answer_correct' => $this->when($myAnswer !== null, $myAnswer?->is_correct),
        ];
    }
}
