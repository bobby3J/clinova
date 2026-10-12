<?php

namespace App\Domain\Admin\Http\Controllers;

use App\Domain\Admin\Http\Resources\AdminActivityLogResource;
use App\Domain\Admin\Models\AdminActivityLog;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * GET /api/admin/activity-log?page=&per_page=
     * This is the one list in the app with genuinely unbounded growth —
     * it only ever gets appended to, nothing ever removes from it — so
     * it's the first one paginated, ahead of Users (bounded by real
     * signups) and the curated content lists (Subjects/Topics/Decks/
     * Sounds, which stay small because an admin has to deliberately
     * create each row).
     *
     * Passing a LengthAwarePaginator (from ->paginate()) instead of a
     * plain Collection to Resource::collection() is what adds the
     * `links`/`meta` pagination envelope around `data` automatically —
     * nothing in AdminActivityLogResource itself needed to change.
     */
    public function index(Request $request)
    {
        $perPage = min((int) $request->query('per_page', 20), 100);

        return AdminActivityLogResource::collection(
            AdminActivityLog::with('admin')->latest()->paginate($perPage)
        );
    }
}
