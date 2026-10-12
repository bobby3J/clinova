# Clinova

Clinova is a nursing and midwifery study platform with three local apps:

- `api/` - Laravel 13 API organized by domain, using Sanctum SPA auth and Spatie roles.
- `admin/` - React + Vite admin console for analytics, curriculum, lecturers, users, announcements, flashcards, and sounds.
- `student/` - React + Vite student app for study library, flashcards, AI practice, study sessions, progress, profile, and settings.

The backend uses a DDD-inspired Laravel structure under `api/app/Domain`, with feature folders for `Users`, `StudyLibrary`, `Flashcards`, `SoundLibrary`, `StudySessions`, `AiPractice`, and `Admin`. See [api/docs/ARCHITECTURE.md](api/docs/ARCHITECTURE.md) and [api/docs/API_REFERENCE.md](api/docs/API_REFERENCE.md) for the deeper backend and integration notes.

## Tech Stack

- Laravel 13, PHP 8.3, Sanctum, Spatie Laravel Permission
- React 18, TypeScript, Vite 6
- Tailwind CSS 4
- MySQL for local app data, SQLite for the default test suite
- Gemini-backed AI practice generation with a template fallback

## Local Setup

Install dependencies in each app:

```bash
cd api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed

cd ../admin
npm install

cd ../student
npm install
```

Seeded users use the factory password `password`:

- Admin: `admin@example.com`
- Student: `test@example.com`
- Lecturer: `lecturer@example.com`

## Environment Notes

The API expects both frontend origins in `api/.env`:

```env
FRONTEND_URLS=http://localhost:5173,http://127.0.0.1:5174
SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5174
```

For local simultaneous login, admin intentionally runs through `localhost`, while the student app runs through `127.0.0.1`. This keeps Laravel's session and XSRF cookies separate in the browser, so you can stay logged into admin and student accounts at the same time.

## Running Locally

Start the API:

```bash
cd api
php artisan serve --host=127.0.0.1 --port=8000
```

Start the admin console:

```bash
cd admin
npm run dev
```

Open admin at `http://localhost:5173`.

Start the student app:

```bash
cd student
npm run dev
```

Open student at `http://127.0.0.1:5174`.

## Tests and Builds

Run backend tests:

```bash
cd api
php artisan test
```

Build the frontends:

```bash
cd admin
npm run build

cd ../student
npm run build
```

## API Docs and Postman

- Architecture: [api/docs/ARCHITECTURE.md](api/docs/ARCHITECTURE.md)
- API reference: [api/docs/API_REFERENCE.md](api/docs/API_REFERENCE.md)
- Postman collections and environments: [api/docs/postman](api/docs/postman)

The React apps use Sanctum's cookie-session SPA flow. Bearer tokens are useful for Postman and scripted API checks, but they are not the browser login flow.
