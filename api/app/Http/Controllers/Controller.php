<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

/**
 * The one framework-level base class every domain controller extends
 * (see api/docs/ARCHITECTURE.md). AuthorizesRequests is what gives every
 * subclass $this->authorize('ability', $model) — it throws a 403
 * automatically on failure, so controllers never hand-write that check.
 */
abstract class Controller
{
    use AuthorizesRequests;
}
