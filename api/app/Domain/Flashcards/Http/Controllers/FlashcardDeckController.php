<?php

namespace App\Domain\Flashcards\Http\Controllers;

use App\Domain\Flashcards\Actions\PublishFlashcardDeckAction;
use App\Domain\Flashcards\Http\Requests\StoreFlashcardDeckRequest;
use App\Domain\Flashcards\Http\Requests\UpdateFlashcardDeckRequest;
use App\Domain\Flashcards\Http\Resources\FlashcardDeckResource;
use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Shared\Enums\ContentStatus;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class FlashcardDeckController extends Controller
{
    public function index(Request $request)
    {
        $decks = FlashcardDeck::query()
            ->withCount('flashcards')
            ->when($request->query('topic_id'), fn ($query, $topicId) => $query->where('topic_id', $topicId))
            ->when(
                ! $request->user()->canManageStudyContent(),
                fn ($query) => $query->visibleToStudents()
            )
            ->get();

        return FlashcardDeckResource::collection($decks);
    }

    public function store(StoreFlashcardDeckRequest $request)
    {
        // status has a DB-level default ('draft'), but Eloquent's create()
        // doesn't know that until a fresh SELECT — the in-memory model
        // would have status === null right up until the next page load.
        // Setting it explicitly here avoids that gap entirely.
        $deck = FlashcardDeck::create([
            ...$request->validated(),
            'status' => ContentStatus::Draft,
        ]);

        return new FlashcardDeckResource($deck);
    }

    public function publish(Request $request, FlashcardDeck $flashcardDeck, PublishFlashcardDeckAction $action)
    {
        $this->authorize('publish', $flashcardDeck);

        return new FlashcardDeckResource($action->handle($request->user(), $flashcardDeck));
    }

    public function update(UpdateFlashcardDeckRequest $request, FlashcardDeck $flashcardDeck)
    {
        $flashcardDeck->update($request->validated());

        return new FlashcardDeckResource($flashcardDeck);
    }

    /**
     * Cascades to the deck's flashcards at the database level (see the
     * migration's ->cascadeOnDelete()) — same shape as
     * SubjectController::destroy()'s one-call-removes-a-lot situation,
     * including why this is logged (an irreversible cascading delete) and
     * update() above isn't (a routine field edit).
     */
    public function destroy(Request $request, FlashcardDeck $flashcardDeck)
    {
        $this->authorize('delete', $flashcardDeck);

        $description = "Deleted deck \"{$flashcardDeck->title}\"";
        $flashcardDeck->delete();

        event(new AdminActionPerformed(
            admin: $request->user(),
            action: 'deleted_flashcard_deck',
            subject: $flashcardDeck,
            description: $description,
        ));

        return response()->noContent();
    }
}
