<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sounds', function (Blueprint $table) {
            // Set only for an *uploaded* file, never for a pasted file_url
            // — see Sound::resolvedUrl()'s docblock for why a path (not a
            // resolved URL) is what gets stored for an upload.
            $table->string('file_path')->nullable()->after('file_url');
        });

        // file_url was NOT NULL from the original migration — exactly one
        // of file_url/file_path is ever set now (SoundController::store()/
        // update() null out whichever one doesn't apply), so a sound
        // created from an upload legitimately has a null file_url.
        Schema::table('sounds', function (Blueprint $table) {
            $table->string('file_url')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('sounds', function (Blueprint $table) {
            $table->dropColumn('file_path');
            $table->string('file_url')->nullable(false)->change();
        });
    }
};
