<?php

namespace App\Support\Actions;

/**
 * Marker base class for every domain Action.
 *
 * Deliberately declares no handle() signature: PHP requires an overriding
 * method's signature to stay compatible with its parent, and every Action's
 * inputs differ (a User + a DTO, just an id, nothing at all). Enforcing a
 * shared signature here would mean widening every Action to `handle(...$args)`,
 * which throws away the type-hints that make Actions worth reading in the
 * first place. This class exists purely so `instanceof Action` and IDE
 * "find all Actions" tooling have something to key off.
 */
abstract class Action
{
    //
}
