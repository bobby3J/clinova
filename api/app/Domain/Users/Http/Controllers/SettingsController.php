<?php

namespace App\Domain\Users\Http\Controllers;

use App\Domain\Users\Http\Requests\UpdateUserSettingsRequest;
use App\Domain\Users\Http\Resources\UserSettingResource;
use App\Domain\Users\Models\UserSetting;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

/**
 * "Session Settings" — default_duration_minutes/default_sound_id/
 * auto_breaks/notifications_enabled, the user_settings table that's
 * existed since the original migration with no model/controller/route at
 * all until this pass (api/docs/ARCHITECTURE.md described it as planned;
 * it was never built).
 */
class SettingsController extends Controller
{
    /**
     * Both methods below force status 200 explicitly rather than let
     * Laravel's ResourceResponse auto-pick 201 off the model's
     * wasRecentlyCreated flag (the same gotcha documented in
     * ARCHITECTURE.md, a fresh instance of it: findOrCreate() may create
     * a row behind the scenes, but from the client's side "get/update my
     * settings" is always a 200 — whether a row happened to already exist
     * is an implementation detail, not something callers should have to
     * branch a status-code check on).
     */
    public function show(Request $request)
    {
        return (new UserSettingResource($this->findOrCreate($request)))
            ->response()
            ->setStatusCode(200);
    }

    public function update(UpdateUserSettingsRequest $request)
    {
        $settings = $this->findOrCreate($request);
        $settings->update($request->validated());

        return (new UserSettingResource($settings))
            ->response()
            ->setStatusCode(200);
    }

    /**
     * Explicit default values here, not a bare firstOrCreate(['user_id'
     * => ...], []) relying on the migration's DB-level defaults — this
     * codebase has hit the "Model::create() doesn't reflect a DB default
     * on the in-memory model" gotcha several times already (see
     * ARCHITECTURE.md's Models section); setting them explicitly sidesteps
     * it entirely rather than adding a ->refresh() call to work around it.
     */
    private function findOrCreate(Request $request): UserSetting
    {
        return $request->user()->settings ?? UserSetting::create([
            'user_id' => $request->user()->id,
            'default_duration_minutes' => 25,
            'default_sound_id' => null,
            'auto_breaks' => true,
            'notifications_enabled' => true,
        ]);
    }
}
