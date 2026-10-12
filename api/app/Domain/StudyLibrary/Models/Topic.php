<?php

namespace App\Domain\StudyLibrary\Models;

use Database\Factories\TopicFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A Topic is the unit everything else hangs off: StudyMaterials belong to a
 * Topic, and — once that domain exists — so do FlashcardDecks and
 * QuizQuestions. That's exactly why Topic lives here in StudyLibrary rather
 * than being duplicated: Flashcards and AiPractice will *read* this model
 * directly (a legitimate shared reference per the architecture doc), never
 * reach into StudyLibrary's Actions.
 */
#[Fillable(['subject_id', 'name', 'slug', 'order'])]
#[UseFactory(TopicFactory::class)]

class Topic extends Model
{
    use HasFactory;

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function studyMaterials(): HasMany
    {
        return $this->hasMany(StudyMaterial::class);
    }

    /**
     * Same reasoning as Subject::booted() — slug is required, callers only
     * supply `name`. The uniqueness scope differs though: the migration's
     * constraint is unique(['subject_id', 'slug']), not a global unique, so
     * "Introduction" can exist as a topic slug under two different
     * subjects without colliding.
     */
    protected static function booted(): void
    {
        static::creating(function (Topic $topic) {
            if (blank($topic->slug)) {
                $topic->slug = static::uniqueSlugFor($topic->subject_id, $topic->name);
            }
        });
    }

    protected static function uniqueSlugFor(int $subjectId, string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $suffix = 2;

        while (static::where('subject_id', $subjectId)->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }
}
