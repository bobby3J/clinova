<?php

namespace Database\Factories;

use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FlashcardDeck>
 */
class FlashcardDeckFactory extends Factory
{
    private const TITLES = [
        'Pharmacology Deck 4: Antibiotics',
        'Obstetric Danger Signs',
        'Vital Signs Quick Recall',
        'Common Lab Values',
    ];

    public function definition(): array
    {
        return [
            'topic_id' => Topic::factory(),
            'created_by' => null,
            'title' => fake()->randomElement(self::TITLES),
            'description' => fake()->sentence(10),
            'status' => ContentStatus::Draft,
        ];
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ContentStatus::Published,
        ]);
    }
}
