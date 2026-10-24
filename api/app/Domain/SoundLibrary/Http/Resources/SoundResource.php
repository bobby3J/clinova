<?php

namespace App\Domain\SoundLibrary\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\SoundLibrary\Models\Sound
 */
class SoundResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'category' => $this->category,
            // Resolved per-request, not read straight off the column —
            // see Sound::resolvedUrl()'s docblock. For an uploaded file
            // this is a freshly-signed temporary URL when the backing
            // disk is 's3', not a stored, potentially-stale value.
            'file_url' => $this->resolvedUrl(),
            // Not a provenance field (unlike source/license/is_active below) —
            // every caller gets this, so the student sound picker can show a
            // "New" badge on recently-added sounds.
            'created_at' => $this->created_at?->toIso8601String(),
            // Provenance is an admin/legal concern, not something the
            // Study-With-Me sound picker needs to render — same
            // when()-as-closure pattern as StudyMaterialResource, for the
            // same reason (source/license only meaningful to admins).
            'source' => $this->when($request->user()?->hasRole('admin'), fn () => $this->source),
            'license' => $this->when($request->user()?->hasRole('admin'), fn () => $this->license),
            'is_active' => $this->when($request->user()?->hasRole('admin'), fn () => $this->is_active),
        ];
    }
}
