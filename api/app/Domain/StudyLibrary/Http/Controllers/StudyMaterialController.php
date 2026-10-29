<?php

namespace App\Domain\StudyLibrary\Http\Controllers;

use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\StudyLibrary\Actions\PublishStudyMaterialAction;
use App\Domain\StudyLibrary\Http\Requests\StoreStudyMaterialRequest;
use App\Domain\StudyLibrary\Http\Requests\UpdateStudyMaterialRequest;
use App\Domain\StudyLibrary\Http\Resources\StudyMaterialResource;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class StudyMaterialController extends Controller
{
    /**
     * GET /api/study-library/topics/{topic}/materials
     * A student only ever sees published work; anyone who can manage study
     * content (admin or lecturer, reviewing their own content) sees
     * everything. This is the one place that distinction is enforced for
     * *listing* — see StudyMaterialPolicy for the equivalent check on a
     * single item.
     * 
     */
    public function index(Request $request, int $topic)
    {
        $materials = StudyMaterial::query()
            ->where('topic_id', $topic)
            ->when(
                ! $request->user()->canManageStudyContent(),
                fn ($query) => $query->visibleToStudents()
            )
            ->get();

        return StudyMaterialResource::collection($materials);
    }

    /**
     * GET /api/study-library/materials/{studyMaterial}
     * {studyMaterial} in the URL is enough for Laravel to inject the actual
     * model here via route-model binding — no manual
     * StudyMaterial::findOrFail() needed.
     */
    public function show(StudyMaterial $studyMaterial)
    {
        $this->authorize('view', $studyMaterial);

        return new StudyMaterialResource($studyMaterial);
    }

    public function store(StoreStudyMaterialRequest $request)
    {
        $validated = $request->validated();
        unset($validated['slide_file']);

        if ($request->hasFile('slide_file')) {
            $validated['file_path'] = $this->storeUploadedSlideDeck($request);
        }

        // Same reasoning as FlashcardDeckController::store() — status has a
        // DB-level default, but Eloquent's create() won't reflect it on the
        // in-memory model without a fresh SELECT. Set it explicitly.
        $material = StudyMaterial::create([
            ...$validated,
            'created_by' => $request->user()->id,
            'status' => ContentStatus::Draft,
        ]);

        return new StudyMaterialResource($material);
    }

    public function update(UpdateStudyMaterialRequest $request, StudyMaterial $studyMaterial)
    {
        $validated = $request->validated();
        unset($validated['slide_file']);

        if ($request->hasFile('slide_file')) {
            $validated['file_path'] = $this->storeUploadedSlideDeck($request);
        }

        $studyMaterial->update($validated);

        return new StudyMaterialResource($studyMaterial);
    }

    /**
     * Same reasoning as SoundController::storeUploadedAudio() — stores the
     * raw path, not a resolved URL (StudyMaterial::resolvedFileUrl() builds
     * that per-request), on an env-driven disk so local dev and production
     * can point at different storage without a code change.
     */
    private function storeUploadedSlideDeck(Request $request): string
    {
        $disk = config('filesystems.materials_disk');

        return $request->file('slide_file')->store('materials', $disk);
    }

    /**
     * POST /api/study-library/materials/{studyMaterial}/publish
     * The controller's whole job here is authorize, then hand off — the
     * actual state transition lives in PublishStudyMaterialAction. Laravel
     * resolves that Action through the constructor-less container
     * automatically because it's just a plain class with no dependencies.
     */
    public function publish(Request $request, StudyMaterial $studyMaterial, PublishStudyMaterialAction $action)
    {
        $this->authorize('publish', $studyMaterial);

        $material = $action->handle($request->user(), $studyMaterial);

        return new StudyMaterialResource($material);
    }

    public function destroy(StudyMaterial $studyMaterial)
    {
        $this->authorize('delete', $studyMaterial);

        $studyMaterial->delete();

        return response()->noContent();
    }
}
