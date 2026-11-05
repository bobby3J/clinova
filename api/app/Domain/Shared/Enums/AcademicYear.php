<?php

namespace App\Domain\Shared\Enums;

enum AcademicYear: int
{
    case Year1 = 1;
    case Year2 = 2;
    case Year3 = 3;
    case Year4 = 4;

    public function label(): string
    {
        return match ($this) {
            self::Year1 => 'First Year',
            self::Year2 => 'Second Year',
            self::Year3 => 'Third Year',
            self::Year4 => 'Fourth Year',
        };
    }
}
