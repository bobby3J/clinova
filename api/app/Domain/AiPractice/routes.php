<?php

use App\Domain\AiPractice\Http\Controllers\PracticeAnswerController;
use App\Domain\AiPractice\Http\Controllers\PracticeSetController;
use Illuminate\Support\Facades\Route;

// Student-facing only, no role restriction — same openness StudySessions'
// start/finish and Flashcards' due/review endpoints already have. Any
// authenticated user can generate practice for any published topic.
Route::middleware('auth')->prefix('ai-practice')->group(function () {
    Route::get('/sets', [PracticeSetController::class, 'index']);
    Route::post('/sets', [PracticeSetController::class, 'store']);
    Route::post('/questions/{question}/answer', [PracticeAnswerController::class, 'store']);
});
