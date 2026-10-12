<?php

namespace App\Domain\SoundLibrary\Http\Controllers;

use App\Domain\SoundLibrary\Http\Requests\StoreSoundRequest;
use App\Domain\SoundLibrary\Http\Requests\UpdateSoundRequest;
use App\Domain\SoundLibrary\Http\Resources\SoundResource;
use App\Domain\SoundLibrary\Models\Sound;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

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

        // is_active has a DB-level default (true) — set explicitly per the
        // rule in ARCHITECTURE.md rather than trust create() to reflect it.
        $sound = Sound::create([
            'name' => $validated['name'],
            'category' => $validated['category'],
            'file_url' => $request->hasFile('audio_file')
                ? $this->storeUploadedAudio($request)
                : $validated['file_url'],
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
            $validated['file_url'] = $this->storeUploadedAudio($request);
        }

        $sound->update($validated);

        return new SoundResource($sound);
    }

    /**
     * Stores an uploaded sound file on the 'public' disk and returns its
     * public URL — e.g. http://localhost:8000/storage/sounds/<hash>.mp3,
     * served through the storage:link symlink to storage/app/public. The
     * old file (if this is a replace-on-update) is deliberately left in
     * place rather than deleted — not worth the risk of deleting a file
     * some other record might still reference, for a storage cost this
     * small.
     */
    private function storeUploadedAudio(Request $request): string
    {
        $path = $request->file('audio_file')->store('sounds', 'public');

        return Storage::disk('public')->url($path);
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
