<?php

namespace App\Domain\Users\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Users\Models\UserSetting
 */
class UserSettingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'default_duration_minutes' => $this->default_duration_minutes,
            'default_sound_id' => $this->default_sound_id,
            'auto_breaks' => $this->auto_breaks,
            'notifications_enabled' => $this->notifications_enabled,
        ];
    }
}
