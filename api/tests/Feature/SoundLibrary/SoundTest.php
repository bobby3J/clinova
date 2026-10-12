<?php

namespace Tests\Feature\SoundLibrary;

use App\Domain\SoundLibrary\Models\Sound;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesUsers;
use Tests\TestCase;

class SoundTest extends TestCase
{
    use CreatesUsers, RefreshDatabase;

    public function test_students_only_see_active_sounds(): void
    {
        Sound::factory()->count(3)->create();
        Sound::factory()->inactive()->create();

        $response = $this->actingAs($this->student())->getJson('/api/sounds');

        $response->assertOk();
        $this->assertCount(3, $response->json('data'));
    }

    public function test_admins_see_inactive_sounds_too(): void
    {
        Sound::factory()->count(3)->create();
        Sound::factory()->inactive()->create();

        $response = $this->actingAs($this->admin())->getJson('/api/sounds');

        $this->assertCount(4, $response->json('data'));
    }

    /**
     * SoundResource hides source/license/is_active from students entirely
     * (when()-as-closure, same pattern as StudyMaterialResource) — this
     * checks the keys are actually absent, not just null, which is what
     * when() actually does differently from a plain ternary.
     */
    public function test_students_do_not_see_provenance_fields(): void
    {
        Sound::factory()->create();

        $response = $this->actingAs($this->student())->getJson('/api/sounds');

        $response->assertJsonMissingPath('data.0.source');
        $response->assertJsonMissingPath('data.0.license');
        $response->assertJsonMissingPath('data.0.is_active');
    }

    public function test_admins_do_see_provenance_fields(): void
    {
        Sound::factory()->create(['source' => 'freesound.org', 'license' => 'CC0']);

        $response = $this->actingAs($this->admin())->getJson('/api/sounds');

        $response->assertJsonPath('data.0.source', 'freesound.org');
        $response->assertJsonPath('data.0.license', 'CC0');
    }

    public function test_students_cannot_upload_a_sound(): void
    {
        $this->actingAs($this->student())
            ->postJson('/api/sounds', [
                'name' => 'Hacked Sound',
                'category' => 'Nature',
                'file_url' => 'https://example.com/a.mp3',
            ])
            ->assertForbidden();
    }

    /**
     * Regression test for the one gotcha that *didn't* bite on the first
     * try in this domain — is_active has a DB-level default (true), and
     * SoundController::store() sets it explicitly. This is what would
     * catch it going back to implicit if that line were ever removed.
     */
    public function test_admin_can_upload_a_sound_and_it_is_active_by_default(): void
    {
        $response = $this->actingAs($this->admin())
            ->postJson('/api/sounds', [
                'name' => 'Thunderstorm',
                'category' => 'Nature',
                'file_url' => 'https://cdn.example.com/sounds/storm.mp3',
            ]);

        $response->assertCreated();
        $this->assertDatabaseHas('sounds', [
            'name' => 'Thunderstorm',
            'is_active' => true,
        ]);
    }

    public function test_admin_can_upload_a_sound_file_instead_of_a_url(): void
    {
        Storage::fake('public');

        // post(), not postJson() — postJson() JSON-encodes the body, which
        // can't carry a real UploadedFile. post() sends it as actual
        // multipart form data, same as a browser upload would.
        $response = $this->actingAs($this->admin())
            ->post('/api/sounds', [
                'name' => 'Uploaded Rain',
                'category' => 'Nature',
                'audio_file' => UploadedFile::fake()->create('rain.mp3', 500, 'audio/mpeg'),
            ]);

        $response->assertCreated();

        $sound = Sound::where('name', 'Uploaded Rain')->firstOrFail();
        $this->assertStringContainsString('/storage/sounds/', $sound->file_url);
        $this->assertNotEmpty(Storage::disk('public')->files('sounds'));
    }

    public function test_creating_a_sound_without_a_url_or_a_file_is_rejected(): void
    {
        $this->actingAs($this->admin())
            ->postJson('/api/sounds', ['name' => 'No Audio', 'category' => 'Nature'])
            ->assertStatus(422);
    }

    public function test_sound_file_upload_rejects_a_file_over_the_size_limit(): void
    {
        Storage::fake('public');

        $this->actingAs($this->admin())
            ->post('/api/sounds', [
                'name' => 'Too Big',
                'category' => 'Nature',
                // size is in kilobytes — 25000 KB > the 20480 KB (20MB) rule.
                'audio_file' => UploadedFile::fake()->create('huge.mp3', 25000, 'audio/mpeg'),
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_replace_a_sounds_audio_via_upload_on_update(): void
    {
        Storage::fake('public');
        $sound = Sound::factory()->create(['file_url' => 'https://example.com/original.mp3']);

        // Laravel method-spoofing: a real PATCH request's multipart body
        // never reaches PHP's $_FILES (a long-standing PHP limitation, not
        // a Laravel one) — sending POST with _method=PATCH is what lets
        // the file actually arrive while still routing to update().
        $response = $this->actingAs($this->admin())
            ->post("/api/sounds/{$sound->id}", [
                '_method' => 'PATCH',
                'audio_file' => UploadedFile::fake()->create('replacement.mp3', 300, 'audio/mpeg'),
            ]);

        $response->assertOk();
        $this->assertStringContainsString('/storage/sounds/', $sound->fresh()->file_url);
    }

    public function test_admin_can_update_a_sound(): void
    {
        $sound = Sound::factory()->create(['name' => 'Old Name']);

        $this->actingAs($this->admin())
            ->patchJson("/api/sounds/{$sound->id}", ['name' => 'New Name'])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Name');

        $this->assertDatabaseHas('sounds', ['id' => $sound->id, 'name' => 'New Name']);
    }

    public function test_students_cannot_update_a_sound(): void
    {
        $sound = Sound::factory()->create(['name' => 'Old Name']);

        $this->actingAs($this->student())
            ->patchJson("/api/sounds/{$sound->id}", ['name' => 'Hacked Name'])
            ->assertForbidden();

        $this->assertDatabaseHas('sounds', ['id' => $sound->id, 'name' => 'Old Name']);
    }

    /**
     * is_active isn't in UpdateSoundRequest's rules at all — this proves
     * sending it is silently ignored (not validated away with an error,
     * just not a recognized field), and activate()/deactivate() remain
     * the only way to actually flip it.
     */
    public function test_updating_a_sound_cannot_change_is_active(): void
    {
        $sound = Sound::factory()->create(); // active by default

        $this->actingAs($this->admin())
            ->patchJson("/api/sounds/{$sound->id}", ['name' => 'Renamed', 'is_active' => false])
            ->assertOk();

        $this->assertDatabaseHas('sounds', ['id' => $sound->id, 'is_active' => true]);
    }

    public function test_admin_can_deactivate_and_reactivate_a_sound(): void
    {
        $sound = Sound::factory()->create();
        $admin = $this->admin();

        $this->actingAs($admin)
            ->patchJson("/api/sounds/{$sound->id}/deactivate")
            ->assertJsonPath('data.is_active', false);

        $this->actingAs($admin)
            ->patchJson("/api/sounds/{$sound->id}/activate")
            ->assertJsonPath('data.is_active', true);
    }
}
