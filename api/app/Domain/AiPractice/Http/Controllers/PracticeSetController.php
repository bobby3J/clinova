<?php

namespace App\Domain\AiPractice\Http\Controllers;

use App\Domain\AiPractice\Actions\GeneratePracticeSetAction;
use App\Domain\AiPractice\Http\Requests\GeneratePracticeSetRequest;
use App\Domain\AiPractice\Http\Resources\AiPracticeSetResource;
use App\Domain\StudyLibrary\Models\Topic;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PracticeSetController extends Controller
{
    /**
     * GET /api/ai-practice/sets — the caller's own practice history, newest
     * first. Unpaginated like StudySessions' index() — this is "one
     * student's own sets," not a list that grows across users.
     */
    public function index(Request $request)
    {
        $sets = $request->user()
            ->aiPracticeSets()
            ->with(['topic', 'questions.answers' => fn ($q) => $q->where('user_id', $request->user()->id)])
            ->latest()
            ->get();

        return AiPracticeSetResource::collection($sets);
    }

    public function store(GeneratePracticeSetRequest $request, GeneratePracticeSetAction $action)
    {
        $topic = Topic::findOrFail($request->validated('topic_id'));
        $set = $action->handle($request->user(), $topic);

        // Freshly generated — nothing answered yet, but still eager-load
        // `answers` (empty, scoped to this user) so
        // AiPracticeQuestionResource's answeredBy() check doesn't fire an
        // extra query per question.
        $set->load([
            'topic',
            'questions.answers' => fn ($q) => $q->where('user_id', $request->user()->id),
        ]);

        return new AiPracticeSetResource($set);
    }
}
