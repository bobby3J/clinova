<?php

use App\Domain\SoundLibrary\Http\Controllers\SoundController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->prefix('sounds')->group(function () {
    Route::get('/', [SoundController::class, 'index']);

    Route::middleware('role:admin')->group(function () {
        Route::post('/', [SoundController::class, 'store']);
        Route::patch('/{sound}', [SoundController::class, 'update']);
        Route::patch('/{sound}/deactivate', [SoundController::class, 'deactivate']);
        Route::patch('/{sound}/activate', [SoundController::class, 'activate']);
        Route::delete('/{sound}', [SoundController::class, 'destroy']);
    });
});
