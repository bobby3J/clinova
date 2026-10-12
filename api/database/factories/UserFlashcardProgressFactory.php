<?php

namespace Database\Factories;

use App\Domain\Flashcards\Enums\ProgressStatus;
use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\UserFlashcardProgress;
use App\Domain\Users\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<UserFlashcardProgress>
 */
class UserFlashcardProgressFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'flashcard_id' => Flashcard::factory(),
            'status' => ProgressStatus::New,
            'ease_factor' => 2.5,
            'interval_days' => 0,
            'last_reviewed_at' => null,
            'next_review_at' => null,
        ];
    }

    /**
     * State: a card that's already due for review right now — useful for
     * seeding a realistic "due" list to test against without waiting days.
     */
    public function due(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ProgressStatus::Learning,
            'interval_days' => 1,
            'last_reviewed_at' => now()->subDay(),
            'next_review_at' => now()->subMinutes(5),
        ]);
    }
}
