<?php

namespace Database\Factories;

use App\Domain\StudyLibrary\Models\Subject;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Topic>
 */
class TopicFactory extends Factory
{
    private const NAMES = [
        'Cardiovascular System',
        'Antibiotic Therapy',
        'Antenatal Care',
        'Postpartum Hemorrhage',
        'Newborn Assessment',
        'Infection Control',
        'Fluid & Electrolyte Balance',
        'Labour & Delivery',
    ];

    public function definition(): array
    {
        $name = fake()->randomElement(self::NAMES);

        return [
            // Every Topic needs a parent Subject. Calling Subject::factory()
            // here creates a brand-new Subject unless the caller overrides
            // it — e.g. Topic::factory()->for($existingSubject)->create().
            'subject_id' => Subject::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 9999),
            'order' => fake()->numberBetween(0, 20),
        ];
    }
}
