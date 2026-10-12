<?php

namespace App\Domain\Flashcards\Http\Controllers;

use App\Domain\Flashcards\Http\Requests\StoreFlashcardRequest;
use App\Domain\Flashcards\Http\Requests\UpdateFlashcardRequest;
use App\Domain\Flashcards\Http\Resources\FlashcardResource;
use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\FlashcardDeck;
use App\Domain\Shared\Events\AdminActionPerformed;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class FlashcardController extends Controller
{
    /**
     * GET /api/flashcards/decks/{deck}/cards
     * Authorizing against the *deck* (view ability) rather than giving
     * Flashcard its own Policy — a card's visibility is entirely inherited
     * from its parent deck's review status, there's no independent rule.
     */
    public function index(FlashcardDeck $deck)
    {
        $this->authorize('view', $deck);

        return FlashcardResource::collection(
            $deck->flashcards()->orderBy('order')->get()
        );
    }

    public function store(StoreFlashcardRequest $request)
    {
        // Same DB-default gotcha documented in ARCHITECTURE.md, a fresh
        // instance of it: 'order' has a DB-level default of 0, but
        // StoreFlashcardRequest's 'order' rule is nullable-not-required,
        // so an omitted order reaches here as an explicit `null` in
        // validated() — create() would then hand back a model with
        // order === null, not 0, until the next re-fetch. Default it here.
        $flashcard = Flashcard::create([
            ...$request->validated(),
            'order' => $request->validated('order') ?? 0,
        ]);

        return new FlashcardResource($flashcard);
    }

    public function update(UpdateFlashcardRequest $request, Flashcard $flashcard)
    {
        $flashcard->update($request->validated());

        return new FlashcardResource($flashcard);
    }

    /**
     * No Policy on Flashcard (same reasoning as StoreFlashcardRequest) —
     * authorized against the parent deck's 'update' ability directly here
     * rather than via a FormRequest, since destroy has no body to validate.
     * Logged for the same reason every other delete in this pass is —
     * irreversible, unlike a plain update().
     */
    public function destroy(Request $request, Flashcard $flashcard)
    {
        abort_unless($request->user()->can('update', $flashcard->deck), 403);

        $description = 'Deleted flashcard "'.Str::limit($flashcard->question, 50).'"';
        $flashcard->delete();

        event(new AdminActionPerformed(
            admin: $request->user(),
            action: 'deleted_flashcard',
            subject: $flashcard,
            description: $description,
        ));

        return response()->noContent();
    }
}
