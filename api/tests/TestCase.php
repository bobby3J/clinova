<?php

namespace Tests;

use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * RefreshDatabase gives every test a blank database — migrations only,
     * no seeders — so assignRole() has nothing to attach to without this.
     * Checked against class_uses_recursive() rather than seeding
     * unconditionally: Unit tests that don't `use RefreshDatabase` have no
     * database connection to seed into, and would error if this ran
     * regardless. parent::setUp() runs first deliberately — that's what
     * actually executes the migrations the roles table depends on existing.
     */
    protected function setUp(): void
    {
        parent::setUp();

        if (isset(class_uses_recursive(static::class)[RefreshDatabase::class])) {
            $this->seed(RoleSeeder::class);
        }
    }

    /**
     * Only /api/login and /api/logout need this — every other authenticated
     * test should use actingAs($user) instead, which sets the authenticated
     * user directly without touching any of this.
     *
     * Sanctum's EnsureFrontendRequestsAreStateful only attaches session
     * middleware to a request whose Referer/Origin header matches
     * config('sanctum.stateful') — and that check runs for real even
     * inside PHPUnit, confirmed by deliberately reproducing the exact
     * "Session store not set on request" error raw curl hit earlier,
     * inside a test, before finding this fix. Laravel *does* separately
     * auto-skip CSRF token verification during testing (app()->runningUnitTests()),
     * which is why only the Referer header is needed here — a real browser
     * would also need the full XSRF-token cookie handshake.
     *
     * Uses app.frontend_url, not app.url — this is meant to simulate a
     * request FROM the frontend, and app.url is the backend's own address.
     * Using app.url originally only worked because it happened to be in
     * Sanctum's old default stateful list; setting SANCTUM_STATEFUL_DOMAINS
     * explicitly (to wire up the real Vite dev server) replaced that list
     * rather than adding to it, which broke this test until this line was
     * corrected to reference the actually-correct config value.
     */
    protected function asFrontend(): static
    {
        $this->withHeader('Referer', config('app.frontend_url'));

        return $this;
    }
}
