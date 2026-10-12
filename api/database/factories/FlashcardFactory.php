<?php

namespace Database\Factories;

use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\FlashcardDeck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Flashcard>
 */
class FlashcardFactory extends Factory
{
    private const PAIRS = [
        ['q' => 'Normal adult resting heart rate range?', 'a' => '60-100 beats per minute'],
        ['q' => 'First-line treatment for anaphylaxis?', 'a' => 'Intramuscular epinephrine'],
        ['q' => 'Normal fasting blood glucose range?', 'a' => '70-100 mg/dL'],
        ['q' => 'Apgar score components?', 'a' => 'Appearance, Pulse, Grimace, Activity, Respiration'],
        ['q' => 'Signs of postpartum hemorrhage?', 'a' => 'Blood loss >500mL vaginal / >1000mL cesarean, hypotension, tachycardia'],
    ];

    public function definition(): array
    {
        $pair = fake()->randomElement(self::PAIRS);

        return [
            'deck_id' => FlashcardDeck::factory(),
            'question' => $pair['q'],
            'answer' => $pair['a'],
            'order' => fake()->numberBetween(0, 10),
        ];
    }
}
