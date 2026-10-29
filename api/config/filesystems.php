<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Sound Upload Disk
    |--------------------------------------------------------------------------
    |
    | SoundController is the only place in this app that stores an uploaded
    | file (app/Domain/SoundLibrary). Deliberately a separate setting from
    | 'default' above — switching this to 's3' (or any other disk) in
    | production doesn't change where anything else in the framework reads
    | or writes. Set SOUNDS_DISK=s3 wherever local disk won't persist
    | across deploys (most free hosts); leave unset locally.
    |
    */

    'sounds_disk' => env('SOUNDS_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Study Material Upload Disk
    |--------------------------------------------------------------------------
    |
    | Same reasoning as sounds_disk above, separate setting: StudyMaterial's
    | Slides type (app/Domain/StudyLibrary) is the only uploaded-file material
    | type — Note/Tip are typed text, Video/Audio are pasted external links.
    | Set MATERIALS_DISK=s3 wherever local disk won't persist across deploys;
    | leave unset locally.
    |
    */

    'materials_disk' => env('MATERIALS_DISK', 'public'),

    /*
    |--------------------------------------------------------------------------
    | Supabase Public URL Base
    |--------------------------------------------------------------------------
    |
    | Supabase Storage exposes two completely different URL shapes for the
    | same object: its S3-compatible endpoint (AWS_ENDPOINT, what the SDK
    | writes to) and a separate native "public object" URL, under a
    | different hostname (no `storage.` subdomain) and a different path
    | (`/storage/v1/object/public/{bucket}/{path}`, not `/storage/v1/s3/...`).
    | Confirmed live: the S3-endpoint path 403s on a plain GET even for a
    | public bucket ("AccessDenied: Missing signature") — Supabase's S3
    | gateway requires a signature for reads too, it's only the native path
    | that serves unsigned public reads. Both Sound::resolvedUrl() and
    | StudyMaterial::resolvedFileUrl() need this second base URL to build a
    | link that's actually usable; left unset, they fall back to the
    | (write-only-usable) disk URL — fine locally where *_DISK is the local
    | 'public' disk, broken in production without this. Value is just the
    | project's bare URL, e.g. https://<ref>.supabase.co — no path, no
    | trailing slash. One value, same Supabase project, both domains — not
    | sound-specific despite the env var's name (SUPABASE_PUBLIC_URL),
    | which stays as-is so an already-deployed Render service doesn't need a
    | second copy of the same value under a new name.
    |
    */

    'supabase_public_url_base' => env('SUPABASE_PUBLIC_URL'),

    'sounds_public_url_base' => env('SUPABASE_PUBLIC_URL'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            // 'throw' => false (Laravel's default) swallowed a real sound
            // upload failure in production without a trace: store() just
            // returned false, SoundController read that as a valid (empty)
            // path, and the admin got back a 201 with a sound that had no
            // playable URL at all — no exception, no log line, nothing to
            // debug from. Only this app's one disk (used solely by
            // SoundController::storeUploadedAudio() and
            // Sound::resolvedUrl()), so throwing here can't regress
            // anything else.
            'throw' => true,
            'report' => true,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
