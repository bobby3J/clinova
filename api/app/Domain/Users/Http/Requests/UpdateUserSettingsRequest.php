<?php

namespace App\Domain\Users\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Every field sometimes — same "a partial update shouldn't have to
     * resend everything" reasoning as every other Update*Request in this
     * app. 5-180 matches StartFocusSessionRequest's own duration bounds —
     * a default duration outside what a session can actually be created
     * with wouldn't mean anything.
     */
    public function rules(): array
    {
        return [
            'default_duration_minutes' => ['sometimes', 'integer', 'min:5', 'max:180'],
            'default_sound_id' => ['sometimes', 'nullable', 'integer', 'exists:sounds,id'],
            'auto_breaks' => ['sometimes', 'boolean'],
            'notifications_enabled' => ['sometimes', 'boolean'],
        ];
    }
}
