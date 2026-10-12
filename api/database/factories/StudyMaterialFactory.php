<?php

namespace Database\Factories;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Enums\MaterialType;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<StudyMaterial>
 */
class StudyMaterialFactory extends Factory
{
    public function definition(): array
    {
        $type = fake()->randomElement(MaterialType::cases());
        $isTextBased = in_array($type, [MaterialType::Note, MaterialType::Tip], true);

        return [
            'topic_id' => Topic::factory(),
            'created_by' => null,
            'type' => $type,
            'title' => fake()->sentence(4),
            // Note/Tip carry their content as text; video/audio carry a URL
            // instead — only one of the two ever makes sense per row, so we
            // fill whichever one matches the randomly chosen $type. Checked
            // via an explicit two-member array rather than "!== Note", same
            // fix as StoreStudyMaterialRequest's validation rules — that
            // inverse check silently assumed Note was the only text type.
            'body' => $isTextBased ? fake()->paragraphs(3, true) : null,
            'url' => $isTextBased ? null : fake()->url(),
            'duration_minutes' => $isTextBased ? null : fake()->numberBetween(3, 45),
            'status' => ContentStatus::Draft,
        ];
    }

    /**
     * State: a material that's gone through review and is live for students.
     * Usage: StudyMaterial::factory()->published()->create().
     */
    public function published(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => ContentStatus::Published,
            'published_at' => now(),
        ]);
    }

    /**
     * State: a lecturer-authored exam tip, text-based like a note.
     * Usage: StudyMaterial::factory()->tip()->create().
     */
    public function tip(): static
    {
        return $this->state(fn (array $attributes) => [
            'type' => MaterialType::Tip,
            'body' => fake()->paragraph(),
            'url' => null,
            'duration_minutes' => null,
        ]);
    }
}
