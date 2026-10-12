<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `study_materials.type` is a real ENUM/CHECK-constrained column at the DB
 * level, not just a PHP-level constraint (see the original create-table
 * migration) — adding a new MaterialType case has to widen this column
 * too, or a `tip` insert fails at the database layer even though
 * validation already accepts it. Confirmed this matters on *both* backends
 * this app runs on: MySQL (`enum('note','video','audio')`) and SQLite
 * (translated by Laravel into `varchar check (type in (...))` — SQLite has
 * no native ENUM type at all). Laravel 11+'s native column-change support
 * (no doctrine/dbal needed) rebuilds the column correctly on both.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->enum('type', ['note', 'video', 'audio', 'tip'])->change();
        });
    }

    public function down(): void
    {
        Schema::table('study_materials', function (Blueprint $table) {
            $table->enum('type', ['note', 'video', 'audio'])->change();
        });
    }
};
