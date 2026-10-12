<?php

use App\Domain\StudyLibrary\Http\Controllers\StudyMaterialController;
use App\Domain\StudyLibrary\Http\Controllers\SubjectController;
use App\Domain\StudyLibrary\Http\Controllers\TopicController;
use Illuminate\Support\Facades\Route;

// Everything in StudyLibrary requires a logged-in user — there's no guest
// browsing of study content — so auth:sanctum wraps the whole domain once
// here instead of being repeated on every route below.
Route::middleware('auth:sanctum')->prefix('study-library')->group(function () {

    Route::get('/subjects', [SubjectController::class, 'index']);
    Route::get('/topics', [TopicController::class, 'index']);
    Route::get('/topics/{topic}/materials', [StudyMaterialController::class, 'index']);
    Route::get('/materials/{studyMaterial}', [StudyMaterialController::class, 'show']);

    // Nested inside the auth:sanctum group, additionally gated by role —
    // a student hitting any of these gets a 403 before the controller (or
    // even the Form Request) ever runs. admin|lecturer (pipe, not comma —
    // comma is reserved for an explicit guard argument on this middleware)
    // since lecturers manage curriculum content the same way admins do;
    // see User::canManageStudyContent() for the single place that pairing
    // is defined, which every Policy/FormRequest below delegates to.
    Route::middleware('role:admin|lecturer')->group(function () {
        Route::post('/subjects', [SubjectController::class, 'store']);
        Route::patch('/subjects/{subject}', [SubjectController::class, 'update']);
        Route::delete('/subjects/{subject}', [SubjectController::class, 'destroy']);
        Route::post('/topics', [TopicController::class, 'store']);
        Route::patch('/topics/{topic}', [TopicController::class, 'update']);
        Route::delete('/topics/{topic}', [TopicController::class, 'destroy']);
        Route::post('/materials', [StudyMaterialController::class, 'store']);
        Route::patch('/materials/{studyMaterial}', [StudyMaterialController::class, 'update']);
        Route::post('/materials/{studyMaterial}/publish', [StudyMaterialController::class, 'publish']);
        Route::delete('/materials/{studyMaterial}', [StudyMaterialController::class, 'destroy']);
    });
});
