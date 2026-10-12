<?php

use App\Domain\Users\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Domain\Users\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Domain\Users\Http\Controllers\Auth\NewPasswordController;
use App\Domain\Users\Http\Controllers\Auth\PasswordResetLinkController;
use App\Domain\Users\Http\Controllers\Auth\RegisteredUserController;
use App\Domain\Users\Http\Controllers\Auth\VerifyEmailController;
use App\Domain\Users\Http\Controllers\NotificationController;
use App\Domain\Users\Http\Controllers\PasswordController;
use App\Domain\Users\Http\Controllers\SettingsController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [RegisteredUserController::class, 'store'])
    ->middleware('guest')
    ->name('register');

Route::post('/login', [AuthenticatedSessionController::class, 'store'])
    ->middleware('guest')
    ->name('login');

Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
    ->middleware('guest')
    ->name('password.email');

Route::post('/reset-password', [NewPasswordController::class, 'store'])
    ->middleware('guest')
    ->name('password.store');

Route::get('/verify-email/{id}/{hash}', VerifyEmailController::class)
    ->middleware(['auth', 'signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::post('/email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
    ->middleware(['auth', 'throttle:6,1'])
    ->name('verification.send');

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

Route::put('/user/password', [PasswordController::class, 'update'])
    ->middleware('auth')
    ->name('password.update');

Route::get('/notifications', [NotificationController::class, 'index'])
    ->middleware('auth');

Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead'])
    ->middleware('auth');

Route::get('/user/settings', [SettingsController::class, 'show'])
    ->middleware('auth');

Route::put('/user/settings', [SettingsController::class, 'update'])
    ->middleware('auth');
