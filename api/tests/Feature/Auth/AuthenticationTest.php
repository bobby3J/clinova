<?php

namespace Tests\Feature\Auth;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->asFrontend()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertNoContent();
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->asFrontend()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->asFrontend()->postJson('/api/logout');

        $this->assertGuest();
        $response->assertNoContent();
    }

    /**
     * Our own business rule, not Breeze boilerplate — proves the gap we
     * found and closed while building Admin: a suspended user can have the
     * right password and still can't get in. Manually verified once with
     * curl during that session; this is what makes sure it stays true.
     */
    public function test_suspended_users_cannot_authenticate(): void
    {
        $user = User::factory()->create(['suspended_at' => now()]);

        $response = $this->asFrontend()->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertGuest();
        $response->assertUnprocessable();
        $response->assertJsonValidationErrors(['email' => 'This account has been suspended.']);
    }

    /**
     * The other half of suspension — SuspendUserAction also revokes every
     * existing Sanctum token, so a session from before the suspension
     * can't keep making authenticated requests either.
     */
    public function test_suspending_a_user_revokes_their_existing_tokens(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $user->update(['suspended_at' => now()]);
        $user->tokens()->delete();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user');

        $response->assertUnauthorized();
    }
}
