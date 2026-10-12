<?php

namespace App\Domain\Admin\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Users\Models\User
 *
 * Named AdminUserResource, not UserResource — this is specifically the
 * admin-management view of a user (roles, suspension status, streak).
 * A student-facing "my profile" resource, if one gets built later, would
 * show a deliberately different shape and doesn't belong in this domain.
 */
class AdminUserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'roles' => $this->getRoleNames(),
            'track' => $this->track?->value,
            'level' => $this->level,
            'streak_count' => $this->streak_count,
            'is_suspended' => $this->isSuspended(),
            'created_at' => $this->created_at,
        ];
    }
}
