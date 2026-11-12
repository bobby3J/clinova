# Multi-stage build: Composer deps installed in a throwaway stage so the
# final image doesn't carry Composer itself or the dev-only vendor cache.
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM php:8.5-fpm-alpine

# Must match local dev's actual PHP version (8.5.4), not just satisfy
# composer.json's own "php": "^8.3" constraint — composer.lock resolved
# several Symfony components (transitive Laravel dependencies, not
# anything added directly) that require PHP >=8.4.1, since they were
# locked against this machine's real 8.5 install. A composer.json range
# describes what *could* work; the actual locked versions are what matters
# for the runtime image. Confirmed live: 8.3 failed at boot with
# "Composer detected issues in your platform" from vendor/composer/
# platform_check.php, which fires on every request via autoload.php, not
# just at build time — a mismatch here isn't caught by a clean build, only
# by the app actually trying to run.
#
# Extensions actually in use by this app (verified against the local dev
# PHP install, not a generic "just in case" list) + pcntl, which
# `queue:work`'s graceful signal handling needs. gd/intl intentionally
# omitted — nothing in this app uses image manipulation or locale-aware
# formatting.
RUN apk add --no-cache \
    nginx \
    supervisor \
    mysql-client \
    gettext \
    $PHPIZE_DEPS \
    && docker-php-ext-install pdo_mysql bcmath pcntl \
    && apk del $PHPIZE_DEPS

WORKDIR /app
COPY --from=vendor /app /app

# Real upload limits, set directly in php.ini — no PHP_INI_SCAN_DIR
# workaround needed here the way local `artisan serve` needed one; this
# Dockerfile controls php.ini outright. Matches api/public/.user.ini's
# values so local and production behavior agree.
#
# max_execution_time matters for a reason distinct from uploads: PHP's
# default (30s) killed a real AI Practice generation request mid-flight
# once Slides materials started sending a PDF to Gemini as part of the
# prompt — a multimodal call genuinely takes longer than a plain-text one.
# Confirmed live, twice: 30s wasn't enough to even reach
# GeminiQuestionGenerator's own Http::timeout() at all; raising that
# timeout to 90s then hit it exactly too (a PDF-attached Gemini request
# can genuinely take 60-90s+ server-side). 120s here gives real headroom
# above that 90s HTTP timeout, not a coincidentally-close number.
# nginx.conf.template's fastcgi_read_timeout is raised to match — nginx's
# own default (60s) would otherwise cut the connection to php-fpm well
# before either of these.
RUN { \
        echo "upload_max_filesize=20M"; \
        echo "post_max_size=25M"; \
        echo "memory_limit=256M"; \
        echo "max_execution_time=120"; \
    } > /usr/local/etc/php/conf.d/uploads.ini

# The stock php-fpm image ships a "www" pool capped at pm.max_children=5 —
# fine for quick requests, but AI Practice's Gemini calls above can hold a
# worker for up to ~120s each. On Render's free plan, two or three of
# those in flight at once exhausted the pool ("server reached
# pm.max_children setting (5)" in the logs) and starved every other
# request behind them, including a plain Slides upload, until it timed
# out — surfacing as a generic failure in the admin console with no
# Laravel exception to show for it, since the request never even got a
# free worker to start.
#
# Named so it loads after (and overrides) www.conf in php-fpm.d's
# alphabetical include order — FPM merges directives for the same pool
# name across included files, last one wins. pm.max_requests recycles
# workers periodically to guard against slow memory creep rather than
# letting any one process run forever.
#
# catch_workers_output matters for a separate reason: FPM's default is to
# send a worker's own stdout/stderr to /dev/null per the FastCGI spec, not
# to the master process's log. Laravel writing to the 'stderr' channel
# (see render.yaml's LOG_CHANNEL) is useless on Render unless this is on —
# otherwise the exception that actually explains a 500 never reaches
# anywhere Render's log viewer can show it, same blind spot as the
# default file-based 'stack' channel this replaces.
RUN { \
        echo "[www]"; \
        echo "pm.max_children=8"; \
        echo "pm.start_servers=2"; \
        echo "pm.min_spare_servers=1"; \
        echo "pm.max_spare_servers=4"; \
        echo "pm.max_requests=500"; \
        echo "catch_workers_output=yes"; \
        echo "decorate_workers_output=no"; \
    } > /usr/local/etc/php-fpm.d/zz-pool-tuning.conf

COPY docker/nginx.conf.template /etc/nginx/http.d/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
