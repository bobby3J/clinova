<?php

namespace App\Domain\StudyLibrary\Http\Requests;

use App\Domain\Shared\Enums\Track;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubjectRequest extends FormRequest
{
    /**
     * No Policy class for Subject — creating one is a single, unambiguous
     * rule ("must be able to manage study content"), not several
     * related-but-different abilities like StudyMaterial has. A Policy
     * would just wrap this one line in more ceremony without adding
     * anything.
     */
    public function authorize(): bool
    {
        return $this->user()->canManageStudyContent();
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'track' => ['required', Rule::enum(Track::class)],
        ];
    }
}
