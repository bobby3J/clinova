<?php

namespace App\Domain\StudyLibrary\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTopicRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->canManageStudyContent();
    }

    /**
     * subject_id is deliberately not editable here — moving a topic to a
     * different subject isn't a field edit, it's a structural change the
     * product doesn't have a use case for yet. Add it later if that
     * changes, same way StudyMaterial's type ended up create-only.
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'order' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}
