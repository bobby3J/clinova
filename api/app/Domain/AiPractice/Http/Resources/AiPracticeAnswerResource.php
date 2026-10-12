<?php

namespace App\Domain\AiPractice\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\AiPractice\Models\AiPracticeAnswer
 */
class AiPracticeAnswerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'question_id' => $this->question_id,
            'selected_option' => $this->selected_option,
            'is_correct' => $this->is_correct,
            'correct_option' => $this->question->correct_option,
            'explanation' => $this->question->explanation,
        ];
    }
}
