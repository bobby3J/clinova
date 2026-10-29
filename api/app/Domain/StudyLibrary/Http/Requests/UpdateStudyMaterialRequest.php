<?php

namespace App\Domain\StudyLibrary\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStudyMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        // The route model binding already resolved a StudyMaterial instance
        // (see routes.php) — authorize against that specific instance, not
        // just the class, so StudyMaterialPolicy::update() runs.
        return $this->user()->can('update', $this->route('studyMaterial'));
    }

    /**
     * 'sometimes' on every field: an update request may only be changing
     * the title, and shouldn't be forced to resend everything else.
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'body' => ['sometimes', 'nullable', 'string'],
            'url' => ['sometimes', 'nullable', 'url', 'max:2048'],
            'slide_file' => ['sometimes', 'nullable', 'file', 'mimes:pdf', 'max:20480'],
            'duration_minutes' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:600'],
        ];
    }
}
