<?php

namespace App\Domain\Admin\Models;

use App\Domain\Users\Models\User;
use Database\Factories\AdminActivityLogFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

#[Fillable(['admin_id', 'action', 'subject_type', 'subject_id', 'description'])]
#[UseFactory(AdminActivityLogFactory::class)]

class AdminActivityLog extends Model
{
    use HasFactory;

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    /**
     * subject_type/subject_id (from nullableMorphs('subject') in the
     * migration) let one log table reference a StudyMaterial today and a
     * FlashcardDeck or a User tomorrow without a column per domain.
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
