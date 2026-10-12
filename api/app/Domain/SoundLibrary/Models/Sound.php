<?php

namespace App\Domain\SoundLibrary\Models;

use App\Domain\Users\Models\User;
use Database\Factories\SoundFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * An ambient sound for the Study-With-Me focus timer. No draft/published
 * workflow like StudyMaterial or FlashcardDeck — a sound is either active
 * (shows up in the picker) or not. Simpler domain, simpler model: no Policy,
 * no Action, just this and a Controller.
 */
#[Fillable(['uploaded_by', 'name', 'category', 'file_url', 'source', 'license', 'is_active'])]
#[UseFactory(SoundFactory::class)]

class Sound extends Model
{
    use HasFactory;

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Laravel 13's typed local-scope convention — #[Scope] on a plainly
     * named method instead of the old scopeActive($query) magic-prefix
     * style. Same external call syntax either way (->active()), but the
     * $query parameter is now actually typed, which is what was missing.
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
