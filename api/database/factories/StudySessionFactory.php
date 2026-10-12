<?php

namespace Database\Factories;

use App\Domain\StudySessions\Enums\SessionType;
use App\Domain\StudySessions\Models\StudySession;
use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudySession>
 */
class StudySessionFactory extends Factory
{
    public function definition(): array
    {
        $planned = fake()->randomElement([25, 50, 90]);

        return [
            'user_id' => User::factory(),
            'sound_id' => null,
            'type' => SessionType::Focus,
            'planned_minutes' => $planned,
            'actual_minutes' => 0,
            'completed' => false,
            'started_at' => now(),
            'ended_at' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'actual_minutes' => $attributes['planned_minutes'],
            'completed' => true,
            'ended_at' => now()->addMinutes($attributes['planned_minutes']),
        ]);
    }
}
