<?php

namespace App\Domain\Admin\Http\Controllers;

use App\Domain\Admin\Actions\GetOverviewMetricsAction;
use App\Domain\Admin\Actions\GetStudyActivityOverTimeAction;
use App\Http\Controllers\Controller;
use App\Support\Http\ApiResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function overview(GetOverviewMetricsAction $action)
    {
        return ApiResponse::success($action->handle());
    }

    public function studyActivity(Request $request, GetStudyActivityOverTimeAction $action)
    {
        // Capped at 90 — this chart is a 30-day-window UI by default; 90
        // is generous headroom for a future "last quarter" view without
        // letting the query param blow the window out indefinitely.
        $days = max(1, min((int) $request->query('days', 30), 90));

        return ApiResponse::success($action->handle($days));
    }
}
