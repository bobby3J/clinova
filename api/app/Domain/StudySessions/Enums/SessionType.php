<?php

namespace App\Domain\StudySessions\Enums;

enum SessionType: string
{
    case Focus = 'focus';
    case Break = 'break';
}
