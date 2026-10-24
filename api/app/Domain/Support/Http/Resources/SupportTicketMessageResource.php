<?php

namespace App\Domain\Support\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Domain\Support\Models\SupportTicketMessage
 */
class SupportTicketMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'author_name' => $this->whenLoaded('user', fn () => $this->user->name),
            // Derived at read time from the author's *current* role, not
            // stored on the row — see the support_ticket_messages
            // migration's comment on why there's no separate column for
            // this. Is what lets the frontend style a message bubble
            // differently depending on who sent it, without the resource
            // also having to expose whichever IDs would let the frontend
            // work that out itself.
            'is_admin' => $this->whenLoaded('user', fn () => $this->user->hasRole('admin')),
            'created_at' => $this->created_at,
        ];
    }
}
