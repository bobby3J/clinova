<?php

namespace App\Domain\Support\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Support\Models\SupportTicket
 */
class SupportTicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'category' => $this->category,
            'status' => $this->status,
            // Who filed it — only meaningful to an admin browsing every
            // student's tickets; a student already knows it's their own,
            // same $this->when()-as-closure pattern StudyMaterialResource
            // uses for admin-only fields.
            'student_name' => $this->when(
                $request->user()->hasRole('admin') && $this->relationLoaded('user'),
                fn () => $this->user->name,
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'messages' => SupportTicketMessageResource::collection($this->whenLoaded('messages')),
        ];
    }
}
