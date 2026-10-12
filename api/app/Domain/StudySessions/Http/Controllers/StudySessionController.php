<?php

namespace App\Domain\StudySessions\Http\Controllers;

use App\Domain\StudySessions\Actions\FinishFocusSessionAction;
use App\Domain\StudySessions\Actions\StartFocusSessionAction;
use App\Domain\StudySessions\Http\Requests\FinishFocusSessionRequest;
use App\Domain\StudySessions\Http\Requests\StartFocusSessionRequest;
use App\Domain\StudySessions\Http\Resources\StudySessionResource;
use App\Domain\StudySessions\Models\StudySession;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StudySessionController extends Controller
{
    /**
     * GET /api/study-sessions — a student's own session history. No
     * ownership Policy needed here the way show/finish need one: the query
     * is scoped to $request->user() from the start, there's no other
     * user's data it could leak.
     */
    public function index(Request $request)
    {
        return StudySessionResource::collection(
            $request->user()->studySessions()->latest('started_at')->get()
        );
    }

    public function store(StartFocusSessionRequest $request, StartFocusSessionAction $action)
    {
        $session = $action->handle(
            $request->user(),
            $request->validated('planned_minutes'),
            $request->validated('sound_id')
        );

        return new StudySessionResource($session);
    }

    public function finish(FinishFocusSessionRequest $request, StudySession $studySession, FinishFocusSessionAction $action)
    {
        $session = $action->handle(
            $studySession,
            $request->validated('actual_minutes'),
            $request->validated('completed')
        );

        return new StudySessionResource($session);
    }
}
