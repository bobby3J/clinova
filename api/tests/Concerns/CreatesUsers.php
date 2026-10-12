<?php

namespace Tests\Concerns;

use App\Domain\Users\Models\User;

/**
 * Pulled out after the second test file (StudyMaterialTest) repeated these
 * verbatim — the signal to stop copy-pasting and share it, same rule we've
 * applied to the app code all along.
 */
trait CreatesUsers
{
    protected function admin(): User
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');

        return $admin;
    }

    protected function student(): User
    {
        $student = User::factory()->create();
        $student->assignRole('student');

        return $student;
    }

    protected function lecturer(): User
    {
        $lecturer = User::factory()->create();
        $lecturer->assignRole('lecturer');

        return $lecturer;
    }
}
