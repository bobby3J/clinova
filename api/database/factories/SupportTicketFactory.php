<?php

namespace Database\Factories;

use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Support\Models\SupportTicket;
use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupportTicket>
 */
class SupportTicketFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'subject' => fake()->sentence(6),
            'category' => fake()->randomElement(['bug', 'question', 'feedback', 'other']),
            'status' => TicketStatus::Open,
        ];
    }

    public function inProgress(): static
    {
        return $this->state(fn () => ['status' => TicketStatus::InProgress]);
    }

    public function resolved(): static
    {
        return $this->state(fn () => ['status' => TicketStatus::Resolved]);
    }
}
