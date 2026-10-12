<?php

namespace App\Domain\StudyLibrary\Http\Controllers;

use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\StudyLibrary\Http\Requests\StoreTopicRequest;
use App\Domain\StudyLibrary\Http\Requests\UpdateTopicRequest;
use App\Domain\StudyLibrary\Http\Resources\TopicResource;
use App\Domain\StudyLibrary\Models\Topic;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class TopicController extends Controller
{
    /**
     * GET /api/study-library/topics?subject_id=3
     * Drilling into a Subject on the student side (Home → Study Library →
     * a Subject → its Topics, per Flow 3.1's onboarding leading here).
     */
    public function index(Request $request)
    {
        $topics = Topic::query()
            ->when($request->query('subject_id'), fn ($query, $subjectId) => $query->where('subject_id', $subjectId))
            ->orderBy('order')
            ->get();

        return TopicResource::collection($topics);
    }

    public function store(StoreTopicRequest $request)
    {
        // Same DB-default gotcha documented in ARCHITECTURE.md: 'order'
        // defaults to 0 at the DB level, but StoreTopicRequest's 'order'
        // rule is nullable-not-required, so an omitted order reaches here
        // as an explicit `null` — create() would hand back order === null,
        // not 0, until the next re-fetch. Default it here. (Flashcard hit
        // the identical bug — see FlashcardController::store().)
        $topic = Topic::create([
            ...$request->validated(),
            'order' => $request->validated('order') ?? 0,
        ]);

        return new TopicResource($topic);
    }

    /**
     * PATCH /api/study-library/topics/{topic} — admin only.
     */
    public function update(UpdateTopicRequest $request, Topic $topic)
    {
        $topic->update($request->validated());

        return new TopicResource($topic);
    }

    /**
     * DELETE /api/study-library/topics/{topic} — admin only. Cascades to
     * the topic's study_materials at the database level — see
     * SubjectController::destroy()'s comment, same reasoning applies here
     * one level down, including why this is logged and a plain update()
     * isn't.
     */
    public function destroy(Request $request, Topic $topic)
    {
        $description = "Deleted topic \"{$topic->name}\"";
        $topic->delete();

        event(new AdminActionPerformed(
            admin: $request->user(),
            action: 'deleted_topic',
            subject: $topic,
            description: $description,
        ));

        return response()->noContent();
    }
}
