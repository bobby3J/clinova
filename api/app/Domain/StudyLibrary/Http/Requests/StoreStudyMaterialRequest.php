<?php

namespace App\Domain\StudyLibrary\Http\Requests;

use App\Domain\StudyLibrary\Enums\MaterialType;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A Form Request does two jobs the controller would otherwise have to do
 * itself: decide WHO can make this request (authorize) and decide WHAT a
 * valid request looks like (rules). By the time the controller method
 * runs, both questions are already answered — the controller only has to
 * read $request->validated().
 */
class StoreStudyMaterialRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Delegates to StudyMaterialPolicy::create(). Laravel resolves the
        // policy for us because the ability's second argument is the model
        // *class* (we're creating one, so there's no instance yet).
        return $this->user()->can('create', StudyMaterial::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'topic_id' => ['required', 'integer', 'exists:topics,id'],
            'type' => ['required', Rule::enum(MaterialType::class)],
            'title' => ['required', 'string', 'max:255'],
            // Note and Tip are both text-based (need body); Video/Audio are
            // both URL-based (need url) — enforced with conditional rules
            // rather than four separate endpoints. Listed explicitly by
            // type rather than as each other's inverse (the old
            // required_unless:type,note form), since that silently assumed
            // "anything that isn't a note needs a URL" — true for the
            // original three types, wrong the moment a second text-based
            // type (Tip) was added.
            'body' => ['required_if:type,'.MaterialType::Note->value.','.MaterialType::Tip->value, 'nullable', 'string'],
            'url' => ['required_if:type,'.MaterialType::Video->value.','.MaterialType::Audio->value, 'nullable', 'url', 'max:2048'],
            // Slides is the one uploaded-file type — matches Sound's own
            // upload rule (mimes/size), just pdf-only.
            'slide_file' => [
                'required_if:type,'.MaterialType::Slides->value,
                'nullable',
                'file',
                'mimes:pdf',
                'max:20480', // KB — matches public/.user.ini's upload_max_filesize
            ],
            'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:600'],
        ];
    }
}
