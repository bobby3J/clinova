<?php

namespace Database\Factories;

use App\Domain\SoundLibrary\Models\Sound;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sound>
 */
class SoundFactory extends Factory
{
    private const SOUNDS = [
        ['name' => 'Lo-fi Beats', 'category' => 'Music'],
        ['name' => 'Rain Sounds', 'category' => 'Nature'],
        ['name' => 'Forest Ambience', 'category' => 'Nature'],
        ['name' => 'White Noise', 'category' => 'Noise'],
        ['name' => 'Ocean Waves', 'category' => 'Nature'],
        ['name' => 'Piano', 'category' => 'Music'],
    ];

    public function definition(): array
    {
        $sound = fake()->randomElement(self::SOUNDS);

        return [
            'uploaded_by' => null,
            'name' => $sound['name'],
            'category' => $sound['category'],
            'file_url' => 'https://cdn.example.com/sounds/'.fake()->uuid().'.mp3',
            'source' => 'freesound.org',
            'license' => 'CC0',
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }
}
