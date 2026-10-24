<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

/**
 * Laravel's default auto-discovery only scans the flat app/Listeners/
 * folder, which doesn't exist in this codebase — every domain keeps its
 * own Listeners/ under app/Domain/{X}/Listeners/. Globbing for just those
 * directories (rather than pointing discovery at the whole Domain tree)
 * means adding a new listener anywhere never needs a manual registration
 * step, while never walking into a domain's other files.
 *
 * This used to return [$this->app->path('Domain')] — scanning every file
 * under app/Domain, including each domain's routes.php. DiscoverEvents
 * guesses a PSR-4 class name from a file's path and reflects it, which
 * autoloads the file; on a case-insensitive filesystem (Windows), the
 * guessed class `App\Domain\Users\Routes` resolves to the same file as
 * lowercase `routes.php`, so the whole route file executed a second time
 * outside the `Route::prefix('api')->group()` context — silently
 * registering an unprefixed duplicate of every named route in it. Only
 * surfaced as `php artisan route:cache`'s "Another route has already been
 * assigned name [register]" — `route:list`/`serve` never run route:cache
 * so it stayed invisible until Render's entrypoint ran it for real.
 *
 * shouldDiscoverEvents() must be overridden explicitly like this — the
 * parent class's own check can never pass through plain inheritance, by
 * design (it compares get_class($this) against the literal class the
 * check is written in, which is always the parent, never a subclass).
 */
class EventServiceProvider extends ServiceProvider
{
    public function shouldDiscoverEvents(): bool
    {
        return true;
    }

    protected function discoverEventsWithin(): array
    {
        return glob($this->app->path('Domain').'/*/Listeners') ?: [];
    }
}
