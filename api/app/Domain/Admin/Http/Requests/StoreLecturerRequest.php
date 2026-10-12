<?php

namespace App\Domain\Admin\Http\Requests;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules;

class StoreLecturerRequest extends FormRequest
{
    /**
     * Already enforced at the route layer (role:admin on this whole
     * group), but explicit here too — same belt-and-suspenders pattern as
     * BroadcastAnnouncementRequest, so this Form Request is self-contained
     * if it's ever reused or the route middleware changes out from under it.
     */
    public function authorize(): bool
    {
        return $this->user()->hasRole('admin');
    }

    /**
     * Same shape RegisteredUserController already uses for student
     * self-registration — no reason to invent different rules for an
     * admin-created account.
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ];
    }
}
