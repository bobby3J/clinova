<?php

namespace App\Domain\Users\Http\Controllers\Auth;

use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    /**
     * Handle an incoming registration request.
     *
     * @throws ValidationException
     */
    public function store(Request $request): Response
    {
        $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->string('password')),
        ]);

        // This endpoint is only ever reached by the student app's sign-up
        // screen — admin and lecturer accounts are always admin-created
        // (see Admin\Http\Controllers\LecturerManagementController and the
        // seeders), never self-registered. Assigning 'student' here was a
        // real gap, not a stylistic choice: without it, a freshly
        // registered user had no role at all and would fail every
        // role-gated frontend's isStudent()/isAdmin() check immediately
        // after signing up.
        $user->assignRole('student');

        event(new Registered($user));

        Auth::login($user);

        return response()->noContent();
    }
}
