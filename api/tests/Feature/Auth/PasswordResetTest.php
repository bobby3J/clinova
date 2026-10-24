<?php

namespace Tests\Feature\Auth;

use App\Domain\Users\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    public function test_reset_password_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class);
    }

    /**
     * `Notification::fake()` (used by the two tests above) never actually
     * renders a notification's content — it just records that one *would*
     * have been sent — so neither of them would ever catch a broken or
     * misrouted reset URL. This test lets the real ResetPassword
     * notification render via toMail(), the same path a real email goes
     * through, and inspects the actual link: config('app.frontend_url')
     * wasn't registered in config/app.php at all until this was fixed,
     * so every previous reset email silently contained a bare
     * "/password-reset/..." path with no scheme or host.
     */
    public function test_reset_link_points_at_the_students_own_app_not_admins(): void
    {
        $student = User::factory()->create();
        $student->assignRole('student');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $studentUrl = (new ResetPassword('a-token'))->toMail($student)->actionUrl;
        $adminUrl = (new ResetPassword('a-token'))->toMail($admin)->actionUrl;

        $this->assertStringStartsWith(config('app.student_frontend_url'), $studentUrl);
        $this->assertStringStartsWith(config('app.frontend_url'), $adminUrl);
        $this->assertStringContainsString('/password-reset/a-token', $studentUrl);
    }

    public function test_password_can_be_reset_with_valid_token(): void
    {
        Notification::fake();

        $user = User::factory()->create();

        $this->postJson('/api/forgot-password', ['email' => $user->email]);

        Notification::assertSentTo($user, ResetPassword::class, function (object $notification) use ($user) {
            // assertSessionHasNoErrors() was the Breeze web-stack original —
            // our API returns validation failures as a 422 JSON body, not
            // session-flashed errors, so a plain 200 + no exception is the
            // right proof this succeeded.
            $response = $this->postJson('/api/reset-password', [
                'token' => $notification->token,
                'email' => $user->email,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

            $response->assertStatus(200);

            return true;
        });
    }
}
