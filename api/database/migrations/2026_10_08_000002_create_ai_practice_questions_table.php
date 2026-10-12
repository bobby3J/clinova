<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_practice_questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('set_id')->constrained('ai_practice_sets')->cascadeOnDelete();
            $table->text('question');
            // 4 plain strings, JSON — no separate options table; nothing in
            // this app ever queries into individual option text, only ever
            // reads the whole array at once.
            $table->json('options');
            $table->unsignedTinyInteger('correct_option');
            $table->text('explanation')->nullable();
            $table->unsignedInteger('order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_practice_questions');
    }
};
