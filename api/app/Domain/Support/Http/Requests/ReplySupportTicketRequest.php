<?php

namespace App\Domain\Support\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReplySupportTicketRequest extends FormRequest
{
    /**
     * Ownership (own ticket, or admin) is checked in the controller via
     * $this->authorize('reply', $ticket) once the route-bound model is
     * resolved — same split StudyMaterialController uses, not duplicated
     * here.
     */
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'message' => ['required', 'string', 'max:5000'],
        ];
    }
}
