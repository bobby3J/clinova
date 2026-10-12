<?php

namespace Database\Seeders;

use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\SoundLibrary\Models\Sound;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use App\Domain\Shared\Enums\Track;
use App\Domain\Users\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Roles must exist before assignRole() can be called on anyone below.
        $this->call(RoleSeeder::class);

        $admin = User::factory()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);
        $admin->assignRole('admin');

        $student = User::factory()->create([
            'name' => 'Test Student',
            'email' => 'test@example.com',
        ]);
        $student->assignRole('student');

        $lecturer = User::factory()->create([
            'name' => 'Lecturer User',
            'email' => 'lecturer@example.com',
        ]);
        $lecturer->assignRole('lecturer');

        // A spread of students across both tracks, streaks, and signup
        // dates over the last 30 days — the admin dashboard's charts
        // (track distribution, signup trend) read real rows from this
        // table, so a single student makes them look broken rather than
        // just quiet. created_at is set via forceFill() since it's
        // deliberately not in User's #[Fillable] list for normal app code.
        foreach (range(1, 18) as $i) {
            $extraStudent = User::factory()->create([
                'track' => fake()->randomElement(Track::cases()),
                'streak_count' => fake()->numberBetween(0, 21),
            ]);
            $extraStudent->assignRole('student');

            $createdAt = now()->subDays(fake()->numberBetween(0, 29))
                ->subHours(fake()->numberBetween(0, 23));
            $extraStudent->forceFill([
                'created_at' => $createdAt,
                'updated_at' => $createdAt,
            ])->save();
        }

        // A small, explorable StudyLibrary dataset: a few topics, each with
        // a couple of materials in different review states, so there's
        // something real to hit via Tinker/Postman without hand-typing rows.
        $topics = Topic::factory(3)
            ->has(StudyMaterial::factory()->published()->count(2))
            ->has(StudyMaterial::factory()->count(1)) // stays in draft
            ->create();

        // One published deck with real cards, ready to review immediately.
        FlashcardDeck::factory()
            ->published()
            ->for($topics->first())
            ->has(Flashcard::factory()->count(5))
            ->create();

        // Three active sounds for the Study-With-Me picker, one retired —
        // so the active-only student filter has something real to prove.
        Sound::factory(3)->create();
        Sound::factory()->inactive()->create(['name' => 'Retired Track']);
    }
}
