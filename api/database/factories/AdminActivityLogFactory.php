<?php

namespace Database\Factories;

use App\Domain\Admin\Models\AdminActivityLog;
use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AdminActivityLog>
 */
class AdminActivityLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'admin_id' => User::factory(),
            'action' => fake()->randomElement(['published', 'suspended_user', 'broadcast_announcement']),
            'subject_type' => null,
            'subject_id' => null,
            'description' => fake()->sentence(),
        ];
    }
}
