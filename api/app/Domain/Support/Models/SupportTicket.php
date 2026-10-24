<?php

namespace App\Domain\Support\Models;

use App\Domain\Support\Enums\TicketStatus;
use App\Domain\Users\Models\User;
use Database\Factories\SupportTicketFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A student-reported issue/question, with status progressing
 * open -> in_progress -> resolved as an admin works it. No separate
 * "assigned admin" concept for this first pass — any admin can reply to
 * or resolve any ticket, same openness StudyLibrary's admin endpoints
 * already have (not role-partitioned by which admin "owns" what).
 *
 * `status` IS fillable — same reasoning FlashcardDeck's own fillable
 * comment documents: UpdateSupportTicketStatusAction's plain update()
 * call needs it to actually persist, and the factory's inProgress()/
 * resolved() states need it too (a non-fillable field would silently
 * no-op there as well, not just in the Action — confirmed by trying it).
 * CreateSupportTicketRequest never validates 'status', so client input
 * can't reach it regardless of the Fillable list.
 */
#[Fillable(['user_id', 'subject', 'category', 'status'])]
#[UseFactory(SupportTicketFactory::class)]
class SupportTicket extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => TicketStatus::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportTicketMessage::class)->oldest();
    }

    #[Scope]
    protected function ownedBy(Builder $query, User $user): void
    {
        $query->where('user_id', $user->id);
    }
}
