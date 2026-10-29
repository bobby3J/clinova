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
use Illuminate\Support\Facades\Storage;

/**
 * An ambient sound for the Study-With-Me focus timer. No draft/published
 * workflow like StudyMaterial or FlashcardDeck — a sound is either active
 * (shows up in the picker) or not. Simpler domain, simpler model: no Policy,
 * no Action, just this and a Controller.
 */
#[Fillable(['uploaded_by', 'name', 'category', 'file_url', 'file_path', 'source', 'license', 'is_active'])]
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
     * `file_path` (set only for an *uploaded* file, not a pasted file_url
     * — see SoundController::storeUploadedAudio()) is resolved into a
     * real URL fresh on every call, rather than once at upload time and
     * stored permanently — so swapping the backing disk/provider later
     * never leaves a stale URL sitting in the database.
     *
     * Plain `->url()`/a public-URL build for every disk, not a presigned
     * `temporaryUrl()` — this went through two real providers before
     * landing here. B2 required a *private* bucket (their free tier gates
     * "public" visibility behind a one-time card charge), which meant
     * relying on presigned reads — and those failed consistently against
     * B2's S3-compatible API (confirmed with raw SDK calls, bypassing
     * Laravel entirely, ruling out a Flysystem-specific bug) while plain
     * writes/deletes worked fine. Moved to Supabase Storage instead, with
     * the bucket set **public** — Supabase's own UI offers this as a
     * first-class option with no card involved, and "public" there only
     * affects reads: uploads/deletes still require authorization via
     * their RLS policies, so this doesn't weaken write security at all.
     *
     * Second real gotcha, found after the first live upload: Supabase's
     * S3-compatible *endpoint* (what Flysystem's `s3` adapter writes to
     * and what its own `->url()` builds against) still 403s on a plain
     * read — "AccessDenied: Missing signature" — even on a public bucket.
     * Only Supabase's separate *native* public-object URL, a different
     * hostname and path entirely, actually serves an unsigned public GET.
     * `supabase_public_url_base` (shared with StudyMaterial::resolvedFileUrl()
     * — same Supabase project) is that project base URL; when it's set, it
     * wins over the disk's own `->url()` for exactly this reason.
     */
    public function resolvedUrl(): ?string
    {
        if (! $this->file_path) {
            return $this->file_url;
        }

        $publicUrlBase = config('filesystems.supabase_public_url_base');

        if ($publicUrlBase) {
            $bucket = config('filesystems.disks.s3.bucket');

            return rtrim($publicUrlBase, '/')."/storage/v1/object/public/{$bucket}/{$this->file_path}";
        }

        return Storage::disk(config('filesystems.sounds_disk'))->url($this->file_path);
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
