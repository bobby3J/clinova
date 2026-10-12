<?php

use App\Domain\StudySessions\Http\Controllers\StudySessionController;
use Illuminate\Support\Facades\Route;

// No role:admin group at all in this domain — every route here is a
// student managing their own data, gated by ownership (StudySessionPolicy)
// rather than role.
Route::middleware('auth:sanctum')->prefix('study-sessions')->group(function () {
    Route::get('/', [StudySessionController::class, 'index']);
    Route::post('/', [StudySessionController::class, 'store']);
    Route::patch('/{studySession}/finish', [StudySessionController::class, 'finish']);
});
