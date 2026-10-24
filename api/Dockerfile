# Multi-stage build: Composer deps installed in a throwaway stage so the
# final image doesn't carry Composer itself or the dev-only vendor cache.
FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist
COPY . .
RUN composer dump-autoload --optimize --no-dev

FROM php:8.3-fpm-alpine

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
RUN { \
        echo "upload_max_filesize=20M"; \
        echo "post_max_size=25M"; \
        echo "memory_limit=256M"; \
    } > /usr/local/etc/php/conf.d/uploads.ini

COPY docker/nginx.conf.template /etc/nginx/http.d/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
    && chown -R www-data:www-data /app/storage /app/bootstrap/cache

EXPOSE 8080
ENTRYPOINT ["/entrypoint.sh"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
