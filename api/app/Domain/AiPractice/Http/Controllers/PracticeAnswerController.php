<?php

namespace App\Domain\AiPractice\Http\Controllers;

use App\Domain\AiPractice\Actions\AnswerPracticeQuestionAction;
use App\Domain\AiPractice\Http\Requests\AnswerPracticeQuestionRequest;
use App\Domain\AiPractice\Http\Resources\AiPracticeAnswerResource;
use App\Domain\AiPractice\Models\AiPracticeQuestion;
use App\Http\Controllers\Controller;

class PracticeAnswerController extends Controller
{
    public function store(
        AnswerPracticeQuestionRequest $request,
        AiPracticeQuestion $question,
        AnswerPracticeQuestionAction $action,
    ) {
        $answer = $action->handle(
            $request->user(),
            $question,
            $request->validated('selected_option'),
        );

        return new AiPracticeAnswerResource($answer);
    }
}
