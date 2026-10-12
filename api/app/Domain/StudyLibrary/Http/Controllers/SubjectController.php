<?php

namespace App\Domain\StudyLibrary\Http\Controllers;

use App\Domain\Shared\Events\AdminActionPerformed;
use App\Domain\StudyLibrary\Http\Requests\StoreSubjectRequest;
use App\Domain\StudyLibrary\Http\Requests\UpdateSubjectRequest;
use App\Domain\StudyLibrary\Http\Resources\SubjectResource;
use App\Domain\StudyLibrary\Models\Subject;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class SubjectController extends Controller
{
    /**
     * GET /api/study-library/subjects?track=nursing
     * Public within the app (any authenticated user, per Sanctum on the
     * route group) — this is the "Browse Study Library" use case from
     * Sheet 02, filtered to the student's own track.
     */
    public function index(Request $request)
    {
        $subjects = Subject::query()
            ->when($request->query('track'), fn ($query, $track) => $query->where('track', $track))
            ->get();

        return SubjectResource::collection($subjects);
    }

    /**
     * POST /api/study-library/subjects — admin only. Authorization already
     * happened inside StoreSubjectRequest::authorize() before this method
     * ever runs; if that returned false, Laravel would have thrown a 403
     * and this line would never execute.
     */
    public function store(StoreSubjectRequest $request)
    {
        $subject = Subject::create($request->validated());

        return new SubjectResource($subject);
    }

    /**
     * PATCH /api/study-library/subjects/{subject} — admin only (route
     * middleware). No Policy class, same reasoning as StoreSubjectRequest:
     * one unambiguous rule, nothing instance-specific to check.
     */
    public function update(UpdateSubjectRequest $request, Subject $subject)
    {
        $subject->update($request->validated());

        return new SubjectResource($subject);
    }

    /**
     * DELETE /api/study-library/subjects/{subject} — admin only.
     * Cascades to the subject's topics, and each of those topics'
     * study_materials, at the database level (see the migrations'
     * ->cascadeOnDelete() calls) — this one call can remove a lot. The
     * frontend confirms with an explicit topic/material count before ever
     * sending this request; this endpoint itself does not re-confirm.
     *
     * Logged — unlike the plain update() above, delete is a real,
     * irreversible, cascading state change, which is exactly the bar the
     * rest of this app already uses for what gets audited (publish,
     * suspend, broadcast). Routine edits still aren't logged; this isn't
     * "log every mutation," it's extending the existing rule to the one
     * curriculum action that actually fits it.
     */
    public function destroy(Request $request, Subject $subject)
    {
        $description = "Deleted subject \"{$subject->name}\"";
        $subject->delete();

        event(new AdminActionPerformed(
            admin: $request->user(),
            action: 'deleted_subject',
            subject: $subject,
            description: $description,
        ));

        return response()->noContent();
    }
}
