<?php

namespace App\Domain\SoundLibrary\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSoundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    /**
     * is_active is deliberately not editable here — activate()/deactivate()
     * are the real lifecycle actions for that field (see the comments on
     * those two methods), this is just metadata correction.
     */
    /**
     * file_url / audio_file both `sometimes`, not required_without each
     * other like StoreSoundRequest — an edit might not touch the audio at
     * all (e.g. just fixing the name), so neither being present is valid
     * here, unlike on create.
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:100'],
            'file_url' => ['sometimes', 'url', 'max:2048'],
            'audio_file' => ['sometimes', 'file', 'mimes:mp3,wav,ogg,m4a,aac', 'max:20480'],
            'source' => ['sometimes', 'nullable', 'string', 'max:255'],
            'license' => ['sometimes', 'nullable', 'string', 'max:100'],
        ];
    }
}
