<?php

namespace App\Domain\StudyLibrary\Enums;

/**
 * The content formats a StudyMaterial can be. Backed by a string so the
 * value stored in MySQL (the migration's `enum('type', [...])` column) and
 * the PHP value are identical — no translation table to keep in sync.
 * Changing this list also means a new migration to widen the DB column's
 * own ENUM constraint — the cases here aren't the only place this is
 * enforced (see the migration added alongside Tip).
 */
enum MaterialType: string
{
    case Note = 'note';
    case Video = 'video';
    case Audio = 'audio';

    /** A lecturer-authored exam tip — text-based, same shape as Note. */
    case Tip = 'tip';

    /** An uploaded slide deck (PDF) — see StudyMaterial::resolvedFileUrl(). */
    case Slides = 'slides';
}
