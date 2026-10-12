<?php

namespace App\Domain\AiPractice\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AnswerPracticeQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** 0-3: always exactly 4 options per question (see AiPracticeQuestion's options column). */
    public function rules(): array
    {
        return [
            'selected_option' => ['required', 'integer', 'min:0', 'max:3'],
        ];
    }
}
