<?php

namespace App\Domain\StudyLibrary\Models;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Enums\MaterialType;
use App\Domain\Users\Models\User;
use Database\Factories\StudyMaterialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A single piece of content — a note, video, or audio clip — that a student
 * reads/watches/listens to inside a Topic. `status` and `published_at` exist
 * because admin content goes through a review workflow (Sheet 06: "In
 * review" / "Published" pills) before it's visible to students; see
 * scopeVisibleToStudents() below for where that workflow is actually
 * enforced at query time.
 */
// status/published_at are fillable so PublishStudyMaterialAction's update()
// call actually persists — safe because StoreStudyMaterialRequest and
// UpdateStudyMaterialRequest never validate those keys, so raw client input
// can never reach here regardless of what's mass-assignable.

#[Fillable(['topic_id', 'created_by', 'type', 'title', 'body', 'url', 'duration_minutes', 'status', 'published_at'])]
#[UseFactory(StudyMaterialFactory::class)]

class StudyMaterial extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'type' => MaterialType::class,
            'status' => ContentStatus::class,
            'published_at' => 'datetime',
        ];
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * A query scope, not an Action — this is a read filter, not a use case.
     * Students should only ever see published content; admins bypass this
     * scope entirely in the admin controller (they need to see drafts to
     * review them). Usage: StudyMaterial::visibleToStudents()->get().
     */
    #[Scope]
    protected function visibleToStudents(Builder $query): void
    {
        $query->where('status', ContentStatus::Published);
    }
}
