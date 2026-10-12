<?php

namespace App\Domain\AiPractice\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\AiPractice\Models\AiPracticeSet
 */
class AiPracticeSetResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'topic_id' => $this->topic_id,
            'topic_name' => $this->whenLoaded('topic', fn () => $this->topic->name),
            'created_at' => $this->created_at,
            'questions' => AiPracticeQuestionResource::collection($this->whenLoaded('questions')),
        ];
    }
}
