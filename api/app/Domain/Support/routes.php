<?php

use App\Domain\Support\Http\Controllers\SupportTicketController;
use Illuminate\Support\Facades\Route;

// Student-facing only — "my own tickets," enforced per-method via
// SupportTicketPolicy (view/reply), not by a route-level role middleware
// the way Admin/routes.php's whole file is gated. Any authenticated user
// (students in practice) can open a ticket; ownership is what actually
// restricts reading/replying to one.
Route::middleware('auth')->prefix('support')->group(function () {
    Route::get('/tickets', [SupportTicketController::class, 'index']);
    Route::post('/tickets', [SupportTicketController::class, 'store']);
    Route::get('/tickets/{ticket}', [SupportTicketController::class, 'show']);
    Route::post('/tickets/{ticket}/messages', [SupportTicketController::class, 'replyMessage']);
});
