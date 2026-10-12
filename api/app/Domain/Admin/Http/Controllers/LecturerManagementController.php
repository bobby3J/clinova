<?php

namespace App\Domain\Admin\Http\Controllers;

use App\Domain\Admin\Actions\ReactivateUserAction;
use App\Domain\Admin\Actions\SuspendUserAction;
use App\Domain\Admin\Http\Requests\StoreLecturerRequest;
use App\Domain\Admin\Http\Resources\AdminUserResource;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Sibling to UserManagementController rather than a modification of it —
 * same shape (index/suspend/reactivate), different role filter, plus the
 * one new piece students never needed: a way to actually create the
 * account in the first place, since there's no self-registration path for
 * anything but students. Kept separate so UserManagementController's
 * existing, already-tested behavior for students stays untouched.
 */
class LecturerManagementController extends Controller
{
    /**
     * GET /api/admin/lecturers?page=&per_page=
     * Same pagination shape as UserManagementController::index() — see
     * that method's comment for the full reasoning (bounded by real
     * account creation, not expected to grow large).
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        return AdminUserResource::collection(
            User::role('lecturer')->paginate($perPage)
        );
    }

    /**
     * POST /api/admin/lecturers
     * email_verified_at is set immediately — the admin creating this
     * account is already vouching for the lecturer's identity, so there's
     * no separate email-verification flow to build for this path (unlike
     * student self-registration, which has no one else vouching for it).
     * Set via forceFill()+save() after create(), not inside create()'s
     * array: email_verified_at isn't in User's #[Fillable(...)] list (by
     * design — normal app code should never mass-assign it), so passing
     * it to create() would silently no-op, same DB-default-style gotcha
     * documented in ARCHITECTURE.md for other fields, just the
     * mass-assignment variant of it rather than the DB-default variant.
     */
    public function store(StoreLecturerRequest $request)
    {
        $lecturer = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
        ]);
        $lecturer->forceFill(['email_verified_at' => now()])->save();
        $lecturer->assignRole('lecturer');

        event(new AdminActionPerformed(
            admin: $request->user(),
            action: 'created_lecturer',
            subject: $lecturer,
            description: "Created lecturer account for {$lecturer->name}",
        ));

        return new AdminUserResource($lecturer);
    }

    public function suspend(Request $request, User $user, SuspendUserAction $action)
    {
        return new AdminUserResource($action->handle($request->user(), $user));
    }

    public function reactivate(Request $request, User $user, ReactivateUserAction $action)
    {
        return new AdminUserResource($action->handle($request->user(), $user));
    }
}
