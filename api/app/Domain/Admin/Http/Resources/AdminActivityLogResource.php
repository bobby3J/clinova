<?php

namespace App\Domain\Admin\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Admin\Models\AdminActivityLog
 */
class AdminActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'admin_name' => $this->whenLoaded('admin', fn () => $this->admin->name),
            'action' => $this->action,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'description' => $this->description,
            'created_at' => $this->created_at,
        ];
    }
}
