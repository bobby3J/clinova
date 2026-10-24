<?php

namespace App\Console\Commands;

use App\Domain\Users\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

/**
 * Render's free tier has no Shell access, so there's no way to run
 * `php artisan tinker` by hand to create the first admin account after a
 * fresh deploy against a brand new database. This command fills that gap:
 * wired into docker/entrypoint.sh so it runs on every boot, reading the
 * account to create from ADMIN_EMAIL/ADMIN_PASSWORD env vars (set once on
 * Render, same practice as every other credential in this project — never
 * committed, never passed as a literal in code).
 *
 * Safe to run on every boot (free tier spins the container down and back
 * up often): does nothing if either env var is unset, and does nothing if
 * a user with that email already exists — never overwrites a password an
 * admin may have since changed via the app's own "change password" flow.
 */
class EnsureAdminUserCommand extends Command
{
    protected $signature = 'app:ensure-admin';

    protected $description = 'Create the first admin account from ADMIN_EMAIL/ADMIN_PASSWORD, if neither is already set up';

    public function handle(): int
    {
        $email = env('ADMIN_EMAIL');
        $password = env('ADMIN_PASSWORD');

        if (! $email || ! $password) {
            $this->comment('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping.');

            return self::SUCCESS;
        }

        if (User::where('email', $email)->exists()) {
            $this->comment("A user with email {$email} already exists — skipping.");

            return self::SUCCESS;
        }

        $admin = User::create([
            'name' => 'Admin',
            'email' => $email,
            'password' => Hash::make($password),
            'email_verified_at' => now(),
        ]);
        $admin->assignRole('admin');

        $this->info("Admin account created for {$email}.");

        return self::SUCCESS;
    }
}
