<?php

namespace App\Domain\Flashcards\Http\Controllers;

use App\Domain\Flashcards\Actions\ReviewFlashcardAction;
use App\Domain\Flashcards\Http\Requests\ReviewFlashcardRequest;
use App\Domain\Flashcards\Http\Resources\FlashcardResource;
use App\Domain\Flashcards\Http\Resources\UserFlashcardProgressResource;
use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Shared\Enums\ContentStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * Deliberately a separate controller from FlashcardController: that one
 * manages content (decks/cards, mostly admin-facing); this one manages a
 * single student's personal SRS state, which no admin write path ever
 * touches directly. Same underlying tables, different resource in REST
 * terms — "a review" is its own thing, not a sub-action of "a flashcard."
 */
class FlashcardProgressController extends Controller
{
    /**
     * GET /api/flashcards/due?deck_id=
     * A card is due if it's never been reviewed (no progress row at all —
     * every new card starts "due") or its scheduled next_review_at has
     * arrived. Only ever looks at published decks; a card doesn't count as
     * "due" if it isn't released yet.
     */
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $cards = Flashcard::query()
            ->whereHas('deck', fn ($query) => $query->where('status', ContentStatus::Published))
            ->when(
                $request->query('deck_id'),
                fn ($query, $deckId) => $query->where('deck_id', $deckId)
            )
            ->where(function ($query) use ($userId) {
                $query->whereDoesntHave('progress', fn ($q) => $q->where('user_id', $userId))
                    ->orWhereHas('progress', function ($q) use ($userId) {
                        $q->where('user_id', $userId)->where('next_review_at', '<=', now());
                    });
            })
            ->get();

        return FlashcardResource::collection($cards);
    }

    /**
     * POST /api/flashcards/{flashcard}/review
     * The whole endpoint is "validate, authorize, delegate" — same shape
     * as StudyMaterialController::publish(). ReviewFlashcardAction does
     * everything that actually matters.
     */
    public function store(ReviewFlashcardRequest $request, Flashcard $flashcard, ReviewFlashcardAction $action)
    {
        $progress = $action->handle($request->user(), $flashcard, $request->validated()['quality']);

        return new UserFlashcardProgressResource($progress);
    }
}
