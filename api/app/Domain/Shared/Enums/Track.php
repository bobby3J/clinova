<?php

namespace App\Domain\Shared\Enums;

enum Track: string
{
    case Nursing = 'nursing';
    case Midwifery = 'midwifery';

    public function label(): string
    {
        return match ($this) {
            self::Nursing => 'Nursing',
            self::Midwifery => 'Midwifery',
        };
    }
}
