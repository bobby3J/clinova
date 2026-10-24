#!/bin/sh
set -e

# Config/route/view caching must happen here, at container start, not
# during `docker build` — the real env vars (DB credentials, APP_KEY,
# etc.) only exist once Render actually runs the container. Caching
# during the build stage would bake in blank/missing values permanently.
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Single-instance assumption: fine for a free-tier deployment with one
# running container. If this ever scales to multiple instances, move this
# to a separate one-off release step instead — concurrent instances all
# running `migrate` on boot can race.
php artisan migrate --force

# Idempotent — only acts if ADMIN_EMAIL/ADMIN_PASSWORD are set on Render
# and no user with that email exists yet. The free tier has no Shell
# access, so this is how the first admin account gets created at all.
php artisan db:seed --class=RoleSeeder --force
php artisan app:ensure-admin

php artisan storage:link 2>/dev/null || true

export PORT="${PORT:-8080}"
envsubst '${PORT}' < /etc/nginx/http.d/default.conf.template > /etc/nginx/http.d/default.conf

exec "$@"
