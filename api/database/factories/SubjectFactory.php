<?php

namespace Database\Factories;

use App\Domain\Shared\Enums\Track;
use App\Domain\StudyLibrary\Models\Subject;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Subject>
 */
class SubjectFactory extends Factory
{
    /**
     * A realistic pool instead of fake()->word() — this data is what you'll
     * actually be looking at in Tinker/Postman while testing this domain.
     */
    private const NAMES = [
        'Anatomy & Physiology',
        'Pharmacology',
        'Maternal & Child Health',
        'Community Health Nursing',
        'Medical-Surgical Nursing',
        'Obstetric Emergencies',
        'Neonatal Care',
        'Mental Health Nursing',
    ];

    public function definition(): array
    {
        $name = fake()->randomElement(self::NAMES);

        return [
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(1, 9999),
            'track' => fake()->randomElement(Track::cases()),
        ];
    }
}
