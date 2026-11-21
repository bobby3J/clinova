<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * `study_materials.type` is a real ENUM/CHECK-constrained column at the DB
 * level, not just a PHP-level constraint (see the original create-table
 * migration) — adding a new MaterialType case has to widen this column
 * too, or a `tip` insert fails at the database layer even though
 * validation already accepts it. Confirmed this matters on *all three*
 * backends this app has run on: MySQL (`enum('note','video','audio')`),
 * SQLite (translated by Laravel into `varchar check (type in (...))` — no
 * native ENUM type), and Postgres (same varchar+check shape as SQLite).
 *
 * Postgres needs its own branch, not Laravel's ->enum()->change(): that
 * generates `alter column "type" type varchar(255) check (...)`, which
 * Postgres rejects outright — a CHECK can't be inlined into an ALTER
 * COLUMN TYPE statement, it has to be its own ADD CONSTRAINT. Confirmed
 * live against Supabase Postgres (the production DB as of Nov 2026, moved
 * off Aiven MySQL) — this failed migration is what surfaced the bug.
 * `study_materials_type_check` is Postgres's own auto-generated name for
 * the column's original inline CHECK (confirmed via pg_constraint), not a
 * name this app chose.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('alter table study_materials drop constraint study_materials_type_check');
            DB::statement("alter table study_materials add constraint study_materials_type_check check (type in ('note', 'video', 'audio', 'tip'))");
        } else {
            Schema::table('study_materials', function (Blueprint $table) {
                $table->enum('type', ['note', 'video', 'audio', 'tip'])->change();
            });
        }
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('alter table study_materials drop constraint study_materials_type_check');
            DB::statement("alter table study_materials add constraint study_materials_type_check check (type in ('note', 'video', 'audio'))");
        } else {
            Schema::table('study_materials', function (Blueprint $table) {
                $table->enum('type', ['note', 'video', 'audio'])->change();
            });
        }
    }
};
