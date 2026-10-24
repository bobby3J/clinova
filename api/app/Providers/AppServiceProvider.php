<?php

namespace App\Providers;

use App\Domain\AiPractice\Contracts\QuestionGenerator;
use App\Domain\AiPractice\Generators\GeminiQuestionGenerator;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Real AI generation via Gemini's free tier — see QuestionGenerator's
        // docblock. GeminiQuestionGenerator falls back to TemplateQuestionGenerator
        // internally on any API failure, so this binding never needs a guard.
        $this->app->bind(QuestionGenerator::class, GeminiQuestionGenerator::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Role-aware: a student's reset link must land on the student SPA,
        // not the admin console, and vice versa — the two are genuinely
        // separate apps on separate origins (see config/app.php's own
        // comment on frontend_url/student_frontend_url). $notifiable is
        // the User being reset; hasRole() is available since it's the
        // same model Spatie's HasRoles trait is applied to everywhere
        // else in this app.
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $base = $notifiable->hasRole('student')
                ? config('app.student_frontend_url')
                : config('app.frontend_url');

            return $base."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
