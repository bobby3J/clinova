<?php

namespace App\Domain\StudyLibrary\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\StudyLibrary\Models\StudyMaterial
 */
class StudyMaterialResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'topic_id' => $this->topic_id,
            'type' => $this->type->value,
            'title' => $this->title,
            'body' => $this->body,
            'url' => $this->url,
            // Resolved per-request, not read straight off file_path — see
            // StudyMaterial::resolvedFileUrl()'s docblock. Null for every
            // type except Slides.
            'file_url' => $this->resolvedFileUrl(),
            'duration_minutes' => $this->duration_minutes,
            // $this->when(condition, value) only adds this key to the JSON
            // at all when the condition is true — a student's response
            // simply won't have a "status" or "published_at" key, rather
            // than sending it as null. Review-workflow metadata is an
            // admin/lecturer concern; there's no reason for it to leak to
            // students even harmlessly.
            //
            // Passed as closures, not plain values — when()'s second
            // argument is evaluated eagerly at the call site unless it's a
            // Closure, so $this->status->value would run even for
            // students, and did throw when status was ever null (see
            // FlashcardDeckResource for the incident this pattern fixed).
            'status' => $this->when(
                $request->user()?->canManageStudyContent(),
                fn () => $this->status?->value
            ),
            'published_at' => $this->when(
                $request->user()?->canManageStudyContent(),
                fn () => $this->published_at
            ),
        ];
    }
}
