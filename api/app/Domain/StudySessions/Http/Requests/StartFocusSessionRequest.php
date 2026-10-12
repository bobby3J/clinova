<?php

namespace App\Domain\StudySessions\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StartFocusSessionRequest extends FormRequest
{
    /**
     * No ownership check needed here — there's no existing session to own
     * yet, every authenticated user can start one of their own. Contrast
     * with FinishFocusSessionRequest, which does need one.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // 25/50/90 are the reference app's presets, but Sheet 03 also
            // shows a "custom" option — validated as a range, not an enum.
            'planned_minutes' => ['required', 'integer', 'min:5', 'max:180'],
            'sound_id' => ['nullable', 'integer', 'exists:sounds,id'],
        ];
    }
}
