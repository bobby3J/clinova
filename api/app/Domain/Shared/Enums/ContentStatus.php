<?php

namespace App\Domain\Shared\Enums;

enum ContentStatus: string
{
    case Draft = 'draft';
    case InReview = 'in_review';
    case Published = 'published';
}
