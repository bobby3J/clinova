<?php

use App\Domain\Admin\Http\Controllers\ActivityLogController;
use App\Domain\Admin\Http\Controllers\AnalyticsController;
use App\Domain\Admin\Http\Controllers\AnnouncementController;
use App\Domain\Admin\Http\Controllers\LecturerManagementController;
use App\Domain\Admin\Http\Controllers\SupportTicketController;
use App\Domain\Admin\Http\Controllers\UserManagementController;
use Illuminate\Support\Facades\Route;

// Every single route in this domain is admin-only — unlike every other
// domain's routes.php, there's no public/student-facing group at all here.
// Lecturers get their own widened access in StudyLibrary/Flashcards'
// routes.php, not here — this file is where that widening deliberately
// stops (users, other lecturers' own accounts, announcements, activity
// log, analytics all stay admin-exclusive).
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/users', [UserManagementController::class, 'index']);
    Route::patch('/users/{user}/suspend', [UserManagementController::class, 'suspend']);
    Route::patch('/users/{user}/reactivate', [UserManagementController::class, 'reactivate']);

    Route::get('/lecturers', [LecturerManagementController::class, 'index']);
    Route::post('/lecturers', [LecturerManagementController::class, 'store']);
    Route::patch('/lecturers/{user}/suspend', [LecturerManagementController::class, 'suspend']);
    Route::patch('/lecturers/{user}/reactivate', [LecturerManagementController::class, 'reactivate']);

    Route::post('/announcements', [AnnouncementController::class, 'store']);

    Route::get('/activity-log', [ActivityLogController::class, 'index']);

    Route::get('/analytics/overview', [AnalyticsController::class, 'overview']);
    Route::get('/analytics/study-activity', [AnalyticsController::class, 'studyActivity']);

    // Every student's tickets, not just one — the student-facing half of
    // this same feature (own tickets only) is Support/routes.php,
    // deliberately a separate file even though both drive the same
    // SupportTicket model/Actions. See that controller's docblock.
    Route::get('/support/tickets', [SupportTicketController::class, 'index']);
    Route::get('/support/tickets/{ticket}', [SupportTicketController::class, 'show']);
    Route::post('/support/tickets/{ticket}/messages', [SupportTicketController::class, 'replyMessage']);
    Route::patch('/support/tickets/{ticket}/status', [SupportTicketController::class, 'updateStatus']);
});
