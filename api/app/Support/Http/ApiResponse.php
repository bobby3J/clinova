<?php

namespace App\Support\Http;

use Illuminate\Http\JsonResponse;

class ApiResponse
{
    public static function success(mixed $data = null, ?string $message = null, int $status = 200): JsonResponse
    {
        return response()->json(array_filter([
            'data' => $data,
            'message' => $message,
        ], fn ($value) => ! is_null($value)), $status);
    }

    public static function error(string $message, int $status = 422, ?array $errors = null): JsonResponse
    {
        return response()->json(array_filter([
            'message' => $message,
            'errors' => $errors,
        ], fn ($value) => ! is_null($value)), $status);
    }
}
