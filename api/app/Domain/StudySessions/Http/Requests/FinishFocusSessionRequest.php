<?php

namespace App\Domain\StudySessions\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class FinishFocusSessionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('studySession'));
    }

    /**
     * `completed` distinguishes Flow 3.2's two outcomes: the timer running
     * out (true) vs. the student exiting early (false) — both are valid,
     * both get recorded, only one triggers FocusSessionCompleted.
     */
    public function rules(): array
    {
        return [
            'actual_minutes' => ['required', 'integer', 'min:0'],
            'completed' => ['required', 'boolean'],
        ];
    }
}
