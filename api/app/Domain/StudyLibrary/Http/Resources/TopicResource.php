<?php

namespace App\Domain\StudyLibrary\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\StudyLibrary\Models\Topic
 */
class TopicResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'order' => $this->order,
            'study_materials' => StudyMaterialResource::collection($this->whenLoaded('studyMaterials')),
        ];
    }
}
