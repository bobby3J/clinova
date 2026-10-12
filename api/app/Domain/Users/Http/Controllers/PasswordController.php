<?php

namespace App\Domain\Users\Http\Controllers;

use App\Domain\Users\Http\Requests\UpdatePasswordRequest;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Hash;

/**
 * Authenticated "change my own password" — distinct from
 * Auth\NewPasswordController, which handles the guest forgot-password
 * email-token flow. This one requires already being logged in and knowing
 * the current password; that one requires neither (by design — it's how
 * you recover access when you've lost both).
 */
class PasswordController extends Controller
{
    public function update(UpdatePasswordRequest $request)
    {
        $request->user()->update([
            'password' => Hash::make($request->validated('password')),
        ]);

        return response()->noContent();
    }
}
