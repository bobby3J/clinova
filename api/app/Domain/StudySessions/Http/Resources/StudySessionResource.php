<?php

namespace App\Domain\StudySessions\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\StudySessions\Models\StudySession
 */
class StudySessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'sound_id' => $this->sound_id,
            'type' => $this->type->value,
            'planned_minutes' => $this->planned_minutes,
            'actual_minutes' => $this->actual_minutes,
            'completed' => $this->completed,
            'started_at' => $this->started_at,
            'ended_at' => $this->ended_at,
        ];
    }
}
