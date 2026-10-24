<?php

namespace App\Domain\Support\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateSupportTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated user can open a ticket — students are the
        // only real-world caller today, but nothing here is student-
        // specific the way e.g. AnswerPracticeQuestionRequest's domain is.
        return true;
    }

    public function rules(): array
    {
        return [
            'subject' => ['required', 'string', 'max:255'],
            // Intentionally not `in:bug,question,feedback,other` — see
            // SupportTicket's migration comment. The frontend offers a
            // fixed list as a convenience, not a server-enforced one.
            'category' => ['nullable', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:5000'],
        ];
    }
}
