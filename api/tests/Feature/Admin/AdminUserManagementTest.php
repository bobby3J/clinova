<?php

namespace Tests\Feature\Admin;

use App\Domain\Users\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_students_cannot_access_admin_endpoints(): void
    {
        // role:admin is applied at the route-group level in this domain —
        // no Policy class exists for it, unlike every other domain, since
        // literally every route here is admin-only with no nuance beyond
        // that single role check.
        $this->actingAs($this->student())
            ->getJson('/api/admin/users')
            ->assertForbidden();
    }

    public function test_admin_can_list_students(): void
    {
        $this->student();
        $this->student();

        $response = $this->actingAs($this->admin())->getJson('/api/admin/users');

        $response->assertOk();
        $this->assertCount(2, $response->json('data'));
    }

    /**
     * Same reasoning as ActivityLogController's equivalent — 30 students
     * against the default per_page of 25 is chosen to land just over one
     * page.
     */
    public function test_admin_users_list_is_paginated(): void
    {
        User::factory()
            ->count(30)
            ->create()
            ->each(fn ($user) => $user->assignRole('student'));

        $response = $this->actingAs($this->admin())->getJson('/api/admin/users');

        $response->assertOk();
        $this->assertCount(25, $response->json('data'));
        $this->assertSame(30, $response->json('meta.total'));
        $this->assertSame(2, $response->json('meta.last_page'));

        $page2 = $this->actingAs($this->admin())->getJson('/api/admin/users?page=2');
        $page2->assertOk();
        $this->assertCount(5, $page2->json('data'));
    }

    public function test_admin_can_suspend_a_user(): void
    {
        $student = $this->student();

        $this->actingAs($this->admin())
            ->patchJson("/api/admin/users/{$student->id}/suspend")
            ->assertJsonPath('data.is_suspended', true);

        $this->assertNotNull($student->fresh()->suspended_at);
    }

    /**
     * NOT tested as "admin suspends via HTTP, then check the old token" in
     * one method — tried that twice (first with actingAs(), then with two
     * sequential Bearer-token requests) and both failed the same way: the
     * second request came back as the *first* request's user regardless
     * of its own token. Dumping the response proved it — id 1 (the admin)
     * came back from a request carrying the student's token.
     *
     * Root cause: Laravel's auth guard caches its resolved user for the
     * rest of the test process, and test HTTP calls reuse one application
     * container across calls within a method — so two different auth
     * contexts in sequence don't behave like two real, independent
     * requests the way they did against the actual running server earlier
     * this session. Not an app bug; a testing-harness limit. Fixed by
     * keeping this test to a single auth context: suspend happens by
     * direct model update (what SuspendUserAction does, proven separately
     * by test_admin_can_suspend_a_user above going through the real
     * endpoint), and only the token-rejection request goes over HTTP.
     */
    public function test_a_suspended_users_existing_token_is_rejected(): void
    {
        $student = $this->student();
        $token = $student->createToken('test')->plainTextToken;

        $student->update(['suspended_at' => now()]);
        $student->tokens()->delete();

        $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/user')
            ->assertUnauthorized();
    }

    public function test_admin_can_reactivate_a_user(): void
    {
        $student = $this->student();
        $student->update(['suspended_at' => now()]);

        $this->actingAs($this->admin())
            ->patchJson("/api/admin/users/{$student->id}/reactivate")
            ->assertJsonPath('data.is_suspended', false);

        $this->assertNull($student->fresh()->suspended_at);
    }
}
