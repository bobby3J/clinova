<?php

namespace App\Domain\SoundLibrary\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSoundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    /**
     * Exactly one of file_url / audio_file — either paste a URL to
     * already-hosted audio, or upload a file directly and let the
     * controller store it and derive the URL. required_without on both
     * means omitting both fails validation, and the controller never has
     * to handle "neither was given."
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:100'],
            'file_url' => ['required_without:audio_file', 'nullable', 'url', 'max:2048'],
            'audio_file' => [
                'required_without:file_url',
                'nullable',
                'file',
                'mimes:mp3,wav,ogg,m4a,aac',
                'max:20480', // KB — matches public/.user.ini's upload_max_filesize
            ],
            'source' => ['nullable', 'string', 'max:255'],
            'license' => ['nullable', 'string', 'max:100'],
        ];
    }
}
