<?php

namespace App\Domain\AiPractice\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GeneratePracticeSetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'topic_id' => ['required', 'integer', 'exists:topics,id'],
        ];
    }
}
