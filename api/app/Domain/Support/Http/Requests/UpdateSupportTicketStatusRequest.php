<?php

namespace App\Domain\Support\Http\Requests;

use App\Domain\Support\Enums\TicketStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Enum;

class UpdateSupportTicketStatusRequest extends FormRequest
{
    /**
     * Admin-only regardless of which ticket — SupportTicketPolicy's
     * updateStatus() doesn't vary by ticket either, so checking the role
     * here (same as StoreSoundRequest's authorize()) is equivalent to a
     * controller-level Policy call and avoids a redundant second check.
     */
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    public function rules(): array
    {
        return [
            'status' => ['required', new Enum(TicketStatus::class)],
        ];
    }
}
