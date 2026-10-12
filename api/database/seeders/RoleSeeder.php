<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

/**
 * Spatie's roles aren't a PHP enum — they're rows in the `roles` table,
 * created here once. `firstOrCreate` makes this seeder safe to re-run
 * (`php artisan migrate:fresh --seed` shouldn't ever throw a duplicate-role
 * error just because it's run twice in the same session).
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(['name' => 'student']);
        Role::firstOrCreate(['name' => 'admin']);
        Role::firstOrCreate(['name' => 'lecturer']);
    }
}
