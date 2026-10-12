<?php

namespace App\Domain\StudyLibrary\Http\Requests;

use App\Domain\Shared\Enums\Track;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->canManageStudyContent();
    }

    /**
     * Every field `sometimes`, same reasoning as
     * UpdateStudyMaterialRequest — a rename shouldn't have to resend the
     * track too. The slug intentionally does NOT regenerate on rename
     * (see Subject::booted() — it only fires on creating), so renaming a
     * subject never changes its slug.
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'track' => ['sometimes', Rule::enum(Track::class)],
        ];
    }
}
