<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            // The student who opened it. cascadeOnDelete (not nullOnDelete,
            // unlike e.g. sound_id elsewhere) because a ticket with no
            // owner at all isn't a meaningful record to keep — unlike a
            // study session referencing a deleted sound, which still makes
            // sense on its own.
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('subject');
            // A free-text category, not an enum — deliberately loose for a
            // first pass (bug / question / feedback / other are the
            // frontend's suggested options, but nothing server-side
            // enforces that list, so it's never a source of a validation
            // error the student can't explain).
            $table->string('category')->nullable();
            $table->string('status')->default('open');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
