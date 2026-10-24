<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Each domain owns its own routes.php — this file only wires them up.
// Add a `require` line here the moment a domain gets its first real route.
require base_path('app/Domain/Users/routes.php');
require base_path('app/Domain/StudyLibrary/routes.php');
require base_path('app/Domain/Flashcards/routes.php');
require base_path('app/Domain/SoundLibrary/routes.php');
require base_path('app/Domain/StudySessions/routes.php');
require base_path('app/Domain/Admin/routes.php');
require base_path('app/Domain/AiPractice/routes.php');
require base_path('app/Domain/Support/routes.php');

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    // 'roles' is added explicitly — the raw User model doesn't serialize
    // Spatie's role relation by default, and any frontend (this admin
    // console today, the student app later) needs to know what the
    // logged-in user can do right after auth, not discover it by trial
    // and error against 403s.
    return [
        ...$request->user()->toArray(),
        'roles' => $request->user()->getRoleNames(),
    ];
});
