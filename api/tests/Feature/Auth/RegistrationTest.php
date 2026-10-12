<?php

namespace Tests\Feature\Auth;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_can_register(): void
    {
        // RegisteredUserController::store() calls Auth::login() but never
        // touches $request->session() directly — unlike /login, it doesn't
        // actually need the stateful Referer header to pass. Added anyway:
        // Auth::login() still writes into whatever session IS available,
        // and without asFrontend() there isn't one, so assertAuthenticated()
        // would be checking an auth state that was never persisted.
        $response = $this->asFrontend()->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
    }

    /**
     * A real gap this test catches: a freshly registered user with no
     * role at all would fail isStudent()/isAdmin() on every role-gated
     * frontend immediately after signing up, even though they just
     * successfully authenticated.
     */
    public function test_new_users_are_assigned_the_student_role(): void
    {
        $this->asFrontend()->postJson('/api/register', [
            'name' => 'Test User',
            'email' => 'student-signup@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $user = User::where('email', 'student-signup@example.com')->first();
        $this->assertNotNull($user);
        $this->assertTrue($user->hasRole('student'));
    }
}
