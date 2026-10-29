<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Widens the ENUM the same way 2026_10_06_000001 added `tip` — see that
 * migration's docblock for why this has to change the DB column, not just
 * MaterialType. `file_path` is new: Slides is the first StudyMaterial type
 * that's an *uploaded file* rather than typed text (Note/Tip) or a pasted
 * external link (Video/Audio) — same file_path/resolvedUrl() shape
 * SoundLibrary already uses, not reusing `url` for it (that column's
 * validated as `url:` — a pasted link — StoreStudyMaterialRequest would
 * have to special-case it per type, same confusion Sound's file_url/
 * file_path split was built to avoid in the first place).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->enum('type', ['note', 'video', 'audio', 'tip', 'slides'])->change();
            $table->string('file_path')->nullable()->after('url');
        });
    }

    public function down(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->dropColumn('file_path');
            $table->enum('type', ['note', 'video', 'audio', 'tip'])->change();
        });
    }
};
