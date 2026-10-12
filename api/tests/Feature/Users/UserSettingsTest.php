<?php

namespace Tests\Feature\Users;

use App\Domain\Users\Models\UserSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class UserSettingsTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_getting_settings_for_the_first_time_creates_sensible_defaults(): void
    {
        $student = $this->student();

        $response = $this->actingAs($student)->getJson('/api/user/settings');

        $response->assertOk();
        $response->assertJson([
            'data' => [
                'default_duration_minutes' => 25,
                'default_sound_id' => null,
                'auto_breaks' => true,
                'notifications_enabled' => true,
            ],
        ]);
        $this->assertDatabaseCount('user_settings', 1);
    }

    public function test_getting_settings_twice_does_not_create_a_second_row(): void
    {
        $student = $this->student();

        $this->actingAs($student)->getJson('/api/user/settings');
        $this->actingAs($student)->getJson('/api/user/settings');

        $this->assertDatabaseCount('user_settings', 1);
    }

    public function test_a_student_can_update_their_own_settings(): void
    {
        $student = $this->student();

        $response = $this->actingAs($student)->putJson('/api/user/settings', [
            'default_duration_minutes' => 50,
            'auto_breaks' => false,
        ]);

        $response->assertOk();
        $this->assertSame(50, $response->json('data.default_duration_minutes'));
        $this->assertFalse($response->json('data.auto_breaks'));
        // Untouched fields keep their existing value, not reset to null —
        // confirms this is a partial update, not a full overwrite.
        $this->assertTrue($response->json('data.notifications_enabled'));
    }

    public function test_default_duration_minutes_is_bounded_the_same_as_a_real_session(): void
    {
        $student = $this->student();

        $this->actingAs($student)
            ->putJson('/api/user/settings', ['default_duration_minutes' => 400])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('default_duration_minutes');
    }

    public function test_updating_settings_does_not_leak_across_students(): void
    {
        $studentA = $this->student();
        $studentB = $this->student();
        UserSetting::create([
            'user_id' => $studentA->id,
            'default_duration_minutes' => 90,
            'auto_breaks' => true,
            'notifications_enabled' => true,
        ]);

        $response = $this->actingAs($studentB)->getJson('/api/user/settings');

        $this->assertSame(25, $response->json('data.default_duration_minutes'));
    }
}
