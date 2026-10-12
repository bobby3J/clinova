<?php

namespace App\Domain\Admin\Http\Controllers;

use App\Domain\Admin\Actions\ReactivateUserAction;
use App\Domain\Admin\Actions\SuspendUserAction;
use App\Domain\Admin\Http\Resources\AdminUserResource;
use App\Domain\Users\Models\User;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserManagementController extends Controller
{
    /**
     * GET /api/admin/users?page=&per_page=
     * Second priority for pagination after Activity Log — bounded by real
     * signups rather than growing forever, but still the list most likely
     * to actually need this as the product gets real users. Same
     * ->paginate() swap, same automatic `links`/`meta` envelope — see
     * ActivityLogController::index()'s comment for the full reasoning.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 25), 100);

        return AdminUserResource::collection(
            User::role('student')->paginate($perPage)
        );
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
