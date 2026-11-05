<?php

namespace App\Domain\StudyLibrary\Models;

use App\Domain\Shared\Enums\AcademicYear;
use App\Domain\Shared\Enums\Semester;
use App\Domain\Shared\Enums\Track;
use Database\Factories\SubjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * The top level of the content hierarchy: a Subject belongs to exactly one
 * Track (Nursing or Midwifery — see Sheet 05 of the blueprint), exactly one
 * AcademicYear (1-4), and exactly one Semester (1-2) — Year/Semester are a
 * fixed 4x2 grid the frontends drill into before ever showing a Subject,
 * not admin-creatable entities, so there's no table for either, just these
 * two columns. Contains many Topics. Nothing about "what a subject is" is
 * complex enough to need an Action — creating/editing one is plain CRUD, so
 * this domain's SubjectController talks to this model directly.
 */
#[Fillable(['name', 'track', 'slug', 'year', 'semester'])]
#[UseFactory(SubjectFactory::class)]

class Subject extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'track' => Track::class,
            'year' => AcademicYear::class,
            'semester' => Semester::class,
        ];
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    /**
     * `slug` is required + unique in the migration, but callers (the
     * controller, the factory) only ever supply `name`. Rather than repeat
     * "slugify the name" in every place a Subject gets created, generate it
     * once here, right before the INSERT — self-contained model behavior,
     * not a workflow that belongs in an Action.
     */
    protected static function booted(): void
    {
        static::creating(function (Subject $subject) {
            if (blank($subject->slug)) {
                $subject->slug = static::uniqueSlugFor($subject->name);
            }
        });
    }

    protected static function uniqueSlugFor(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
