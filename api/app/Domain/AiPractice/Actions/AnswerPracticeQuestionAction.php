<?php

namespace App\Domain\AiPractice\Actions;

use App\Domain\AiPractice\Models\AiPracticeAnswer;
use App\Domain\AiPractice\Models\AiPracticeQuestion;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

/**
 * Append-only — a student re-answering the same question just adds
 * another row (see AiPracticeAnswer's own comment); this action never
 * checks for or blocks a repeat answer.
 */
class AnswerPracticeQuestionAction extends Action
{
    public function handle(User $user, AiPracticeQuestion $question, int $selectedOption): AiPracticeAnswer
    {
        return AiPracticeAnswer::create([
            'question_id' => $question->id,
            'user_id' => $user->id,
            'selected_option' => $selectedOption,
            'is_correct' => $selectedOption === $question->correct_option,
        ]);
    }
}
