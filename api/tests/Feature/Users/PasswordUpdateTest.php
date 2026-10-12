<?php

namespace Tests\Feature\Users;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class PasswordUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_user_can_update_their_password(): void
    {
        $user = User::factory()->create(); // UserFactory's default password is 'password'

        $response = $this->actingAs($user)->putJson('/api/user/password', [
            'current_password' => 'password',
            'password' => 'new-stronger-password',
            'password_confirmation' => 'new-stronger-password',
        ]);

        $response->assertNoContent();
        $this->assertTrue(Hash::check('new-stronger-password', $user->fresh()->password));
    }

    public function test_updating_a_password_requires_the_correct_current_password(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->putJson('/api/user/password', [
            'current_password' => 'wrong-password',
            'password' => 'new-stronger-password',
            'password_confirmation' => 'new-stronger-password',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_updating_a_password_requires_confirmation_to_match(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->putJson('/api/user/password', [
            'current_password' => 'password',
            'password' => 'new-stronger-password',
            'password_confirmation' => 'does-not-match',
        ])->assertJsonValidationErrors('password');
    }

    public function test_guests_cannot_update_a_password(): void
    {
        $this->putJson('/api/user/password', [
            'current_password' => 'password',
            'password' => 'new-stronger-password',
            'password_confirmation' => 'new-stronger-password',
        ])->assertUnauthorized();
    }
}
