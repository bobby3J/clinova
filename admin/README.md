# Clinova Admin Console

The admin-facing web console for Clinova, a study-companion app for nursing/midwifery students.
Built with React 18, TypeScript, Vite, and Tailwind CSS v4, talking to the Clinova Laravel API
via Sanctum SPA cookie-session authentication.

This project was bootstrapped from the [TailAdmin](https://tailadmin.com) free React template;
its demo content, bearer-token auth, and unrelated-project branding have been removed and
replaced with Clinova's real pages, auth flow, and branding. See the docs below for what's
actually in place versus what the original template looked like.

## Project docs

- [`PROJECT_STARTING_POINT.md`](./PROJECT_STARTING_POINT.md) — route map, folder structure, auth
  model, what's been cleaned up, what's still placeholder.
- [`REACT_REENTRY_API_GUIDE.md`](./REACT_REENTRY_API_GUIDE.md) — mental model of the app, auth
  flow deep-dive, and a worked example of wiring a real page to the API.
- [`../api/docs/API_REFERENCE.md`](../api/docs/API_REFERENCE.md) — the backend API contract this
  frontend is built against (base URL, auth, every endpoint's request/response shape).
- [`../api/docs/ARCHITECTURE.md`](../api/docs/ARCHITECTURE.md) — how the Laravel backend is
  organized (DDD-inspired domains).

## Prerequisites

- Node.js 18.x or later (20.x+ recommended)
- The Clinova Laravel API running locally (see `../api`) — this console cannot sign in or load
  any admin data without it.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env file and point it at your local API:

   ```bash
   cp .env.example .env
   ```

   `.env` expects:

   ```env
   VITE_API_ORIGIN=http://localhost:8000
   VITE_API_URL=http://localhost:8000/api
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

4. Sign in at `/signin` with an admin account seeded in the Laravel API (student accounts are
   rejected by `AuthGate` — this console is admin-only).

## Stack

- React 18 + TypeScript + Vite
- `react-router` v7 for routing
- Tailwind CSS v4 (Clinova teal brand tokens in `src/index.css`)
- ApexCharts for charts
- Fetch-based API client (`src/lib/api.ts`) — no axios

## License

Inherited from the original TailAdmin React template, MIT licensed — see
[`LICENSE.md`](./LICENSE.md).
