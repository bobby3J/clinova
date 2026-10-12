<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

/**
 * Laravel's default auto-discovery only scans the flat app/Listeners/
 * folder, which doesn't exist in this codebase — every domain keeps its
 * own Listeners/ under app/Domain/{X}/Listeners/. Pointing discovery at the
 * whole Domain tree means adding a new listener anywhere never needs a
 * manual registration step: Laravel finds any class with a handle() method
 * type-hinted to an Event, wherever it lives.
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
        return [$this->app->path('Domain')];
    }
}
