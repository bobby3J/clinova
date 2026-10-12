<?php

namespace App\Domain\Admin\Http\Requests;

use App\Domain\Shared\Enums\Track;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BroadcastAnnouncementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string', 'max:2000'],
            'track' => ['nullable', Rule::enum(Track::class)],
            'level' => ['nullable', 'string', 'max:100'],
        ];
    }
}
