<?php

namespace App\Domain\Admin\Http\Controllers;

use App\Domain\Admin\Actions\BroadcastAnnouncementAction;
use App\Domain\Admin\Http\Requests\BroadcastAnnouncementRequest;
use App\Domain\Shared\Enums\Track;
use App\Http\Controllers\Controller;
use App\Support\Http\ApiResponse;

class AnnouncementController extends Controller
{
    public function store(BroadcastAnnouncementRequest $request, BroadcastAnnouncementAction $action)
    {
        $track = $request->validated('track');

        $recipientCount = $action->handle(
            $request->user(),
            $request->validated('title'),
            $request->validated('body'),
            $track ? Track::from($track) : null,
            $request->validated('level')
        );

        return ApiResponse::success(['recipient_count' => $recipientCount], 'Announcement sent.');
    }
}
