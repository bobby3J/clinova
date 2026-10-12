<?php

namespace Tests\Feature\Admin;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

/**
 * Mirrors AdminUserManagementTest's shape — same controller pattern
 * (index/suspend/reactivate), plus the one new piece this domain needed
 * that student management never did: an actual create endpoint, since
 * there's no self-registration path for anything but students.
 */
class AdminLecturerManagementTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_students_cannot_access_lecturer_endpoints(): void
    {
        $this->actingAs($this->student())
            ->getJson('/api/admin/lecturers')
            ->assertForbidden();
    }

    public function test_admin_can_list_lecturers(): void
    {
        $this->lecturer();
        $this->lecturer();

        $response = $this->actingAs($this->admin())->getJson('/api/admin/lecturers');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    public function test_admin_can_create_a_lecturer(): void
    {
        $response = $this->actingAs($this->admin())
            ->postJson('/api/admin/lecturers', [
                'name' => 'Dr. Adaeze Okafor',
                'email' => 'adaeze.okafor@example.com',
                'password' => 'a-strong-password',
                'password_confirmation' => 'a-strong-password',
            ]);

        $response->assertCreated();
        $this->assertSame(['lecturer'], $response->json('data.roles'));
        $this->assertDatabaseHas('users', ['email' => 'adaeze.okafor@example.com']);

        $lecturer = User::where('email', 'adaeze.okafor@example.com')->first();
        $this->assertTrue($lecturer->hasRole('lecturer'));
        $this->assertNotNull($lecturer->email_verified_at);
    }

    public function test_creating_a_lecturer_requires_matching_password_confirmation(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/admin/lecturers', [
                'name' => 'Dr. Mismatch',
                'email' => 'mismatch@example.com',
                'password' => 'a-strong-password',
                'password_confirmation' => 'does-not-match',
            ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $this->assertDatabaseMissing('users', ['email' => 'mismatch@example.com']);
    }

    public function test_creating_a_lecturer_creates_an_activity_log_entry(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->postJson('/api/admin/lecturers', [
                'name' => 'Dr. Logged',
                'email' => 'logged@example.com',
                'password' => 'a-strong-password',
                'password_confirmation' => 'a-strong-password',
            ])
            ->assertCreated();

        $this->assertDatabaseHas('admin_activity_logs', [
            'admin_id' => $admin->id,
            'action' => 'created_lecturer',
        ]);
    }

    public function test_admin_can_suspend_and_reactivate_a_lecturer(): void
    {
        $lecturer = $this->lecturer();

        $this->actingAs($this->admin())
            ->patchJson("/api/admin/lecturers/{$lecturer->id}/suspend")
            ->assertJsonPath('data.is_suspended', true);
        $this->assertNotNull($lecturer->fresh()->suspended_at);

        $this->actingAs($this->admin())
            ->patchJson("/api/admin/lecturers/{$lecturer->id}/reactivate")
            ->assertJsonPath('data.is_suspended', false);
        $this->assertNull($lecturer->fresh()->suspended_at);
    }

    public function test_lecturer_cannot_create_another_lecturer(): void
    {
        $this->actingAs($this->lecturer())
            ->postJson('/api/admin/lecturers', [
                'name' => 'Should Not Save',
                'email' => 'shouldnot@example.com',
                'password' => 'a-strong-password',
                'password_confirmation' => 'a-strong-password',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'shouldnot@example.com']);
    }
}
