<?php

use App\Domain\Flashcards\Http\Controllers\FlashcardController;
use App\Domain\Flashcards\Http\Controllers\FlashcardDeckController;
use App\Domain\Flashcards\Http\Controllers\FlashcardProgressController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('flashcards')->group(function () {

    Route::get('/decks', [FlashcardDeckController::class, 'index']);
    Route::get('/decks/{deck}/cards', [FlashcardController::class, 'index']);

    // Student-facing SRS review loop — no role restriction, every
    // authenticated user has their own progress state.
    Route::get('/due', [FlashcardProgressController::class, 'index']);
    Route::post('/{flashcard}/review', [FlashcardProgressController::class, 'store']);

    // admin|lecturer (pipe, not comma) — see StudyLibrary/routes.php's
    // comment for the full reasoning; same pairing, same reason.
    Route::middleware('role:admin|lecturer')->group(function () {
        Route::post('/decks', [FlashcardDeckController::class, 'store']);
        Route::patch('/decks/{flashcardDeck}', [FlashcardDeckController::class, 'update']);
        Route::delete('/decks/{flashcardDeck}', [FlashcardDeckController::class, 'destroy']);
        Route::post('/decks/{flashcardDeck}/publish', [FlashcardDeckController::class, 'publish']);
        Route::post('/cards', [FlashcardController::class, 'store']);
        Route::patch('/cards/{flashcard}', [FlashcardController::class, 'update']);
        Route::delete('/cards/{flashcard}', [FlashcardController::class, 'destroy']);
    });
});
