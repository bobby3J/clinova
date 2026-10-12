<?php

namespace App\Domain\Users\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class UpdatePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Any authenticated user may change their own password — there's
        // no instance to check against beyond "is someone logged in,"
        // which the auth:sanctum route middleware already guarantees.
        return true;
    }

    /**
     * 'current_password' is a built-in Laravel rule — verifies the given
     * value against the authenticated user's actual password on the
     * default guard, no manual Hash::check() needed. Same
     * ['required', 'confirmed', Rules\Password::defaults()] shape as
     * RegisteredUserController/NewPasswordController use for the new
     * password itself, kept consistent rather than inventing a third set
     * of rules for the same kind of field.
     */
    public function rules(): array
    {
        return [
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];
    }
}
