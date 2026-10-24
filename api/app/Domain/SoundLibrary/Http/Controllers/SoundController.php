<?php

namespace App\Domain\SoundLibrary\Http\Controllers;

use App\Domain\SoundLibrary\Http\Requests\StoreSoundRequest;
use App\Domain\SoundLibrary\Http\Requests\UpdateSoundRequest;
use App\Domain\SoundLibrary\Http\Resources\SoundResource;
use App\Domain\SoundLibrary\Models\Sound;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SoundController extends Controller
{
    /**
     * GET /api/sounds — the Study-With-Me sound picker's data source.
     * Students only ever see active sounds; admins see the full library
     * (including deactivated ones) so they have something to reactivate.
     */
    public function index(Request $request)
    {
        $sounds = Sound::query()
            ->when(! $request->user()->hasRole('admin'), fn ($query) => $query->active())
            ->get();

        return SoundResource::collection($sounds);
    }

    public function store(StoreSoundRequest $request)
    {
        $validated = $request->validated();
        $uploaded = $request->hasFile('audio_file');

        // is_active has a DB-level default (true) — set explicitly per the
        // rule in ARCHITECTURE.md rather than trust create() to reflect it.
        $sound = Sound::create([
            'name' => $validated['name'],
            'category' => $validated['category'],
            // Exactly one of these is set, per StoreSoundRequest's
            // required_without pairing — an uploaded file stores its raw
            // path (resolved into a real URL per-request, see
            // Sound::resolvedUrl()), a pasted URL stores as-is.
            'file_path' => $uploaded ? $this->storeUploadedAudio($request) : null,
            'file_url' => $uploaded ? null : $validated['file_url'],
            'source' => $validated['source'] ?? null,
            'license' => $validated['license'] ?? null,
            'uploaded_by' => $request->user()->id,
            'is_active' => true,
        ]);

        return new SoundResource($sound);
    }

    public function update(UpdateSoundRequest $request, Sound $sound)
    {
        $validated = $request->validated();
        unset($validated['audio_file']);

        if ($request->hasFile('audio_file')) {
            // Switching to an uploaded file — null out file_url even if
            // this sound previously had a pasted one, so resolvedUrl()
            // doesn't fall back to a now-stale pasted link.
            $validated['file_path'] = $this->storeUploadedAudio($request);
            $validated['file_url'] = null;
        } elseif (isset($validated['file_url'])) {
            // Switching to (or replacing) a pasted URL — same reasoning
            // in reverse, so a leftover file_path doesn't win in
            // resolvedUrl()'s file_path-takes-priority check.
            $validated['file_path'] = null;
        }

        $sound->update($validated);

        return new SoundResource($sound);
    }

    /**
     * Stores an uploaded sound file and returns its storage *path*, not a
     * resolved URL — see Sound::resolvedUrl()'s docblock for why: a
     * private bucket (required to avoid Backblaze-style free-tier
     * providers gating "public" visibility behind card verification) has
     * no stable public URL to return here at all. The disk is env-driven
     * (SOUNDS_DISK, defaults to 'public') rather than hardcoded: local
     * dev keeps writing to storage/app/public (served via the
     * storage:link symlink), while production points this at the 's3'
     * disk (config/filesystems.php — already endpoint-configurable, so it
     * works against any S3-compatible provider, not just AWS) backed by
     * real object storage. Local disk doesn't survive a redeploy on most
     * free hosts — confirmed the hard way once already with a real upload
     * that outlived its database row but not a seeder reset; in
     * production that same ephemeral-disk gap would silently lose the
     * *file* too, not just the row, on every deploy. The old file (if
     * this is a replace-on-update) is deliberately left in place rather
     * than deleted — not worth the risk of deleting a file some other
     * record might still reference, for a storage cost this small.
     */
    private function storeUploadedAudio(Request $request): string
    {
        $disk = config('filesystems.sounds_disk');

        return $request->file('audio_file')->store('sounds', $disk);
    }

    /**
     * PATCH /api/sounds/{sound}/deactivate
     * Deliberately not a delete — pulling a sound out of the picker
     * shouldn't orphan every study_sessions row that already references it
     * (sound_id is nullOnDelete, not cascade, precisely so old session
     * history survives a sound being retired).
     */
    public function deactivate(Sound $sound)
    {
        $sound->update(['is_active' => false]);

        return new SoundResource($sound);
    }

    public function activate(Sound $sound)
    {
        $sound->update(['is_active' => true]);

        return new SoundResource($sound);
    }
}
