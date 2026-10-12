<?php

namespace App\Domain\StudyLibrary\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\StudyLibrary\Models\Subject
 */
class SubjectResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'track' => $this->track->value,
            // whenLoaded() only includes topics in the JSON if the
            // controller actually eager-loaded them (->with('topics')).
            // Without this guard, touching $this->topics here would fire
            // one extra query per Subject when listing many at once —
            // the classic Eloquent N+1 problem.
            'topics' => TopicResource::collection($this->whenLoaded('topics')),
        ];
    }
}
