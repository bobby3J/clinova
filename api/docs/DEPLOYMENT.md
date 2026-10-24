# Deployment — free, no card, four services

Chosen after Wasmer's WASI runtime turned out to crash on Windows before it could even be
verified locally (unimplemented syscall panic in `php/php -- -m`) — Render's Docker-based free
tier has none of that risk, since it's a standard container, not a WASM runtime still maturing
its platform support.

| Piece | Service | Why |
|---|---|---|
| Laravel API | [Render](https://render.com) — free Web Service, Docker | No card for free tier; runs the `Dockerfile` in this repo |
| MySQL database | [Aiven](https://aiven.io) — free-forever MySQL (1GB) | No card; genuinely persistent (not ephemeral like Render's own disk) |
| Sound file storage | [Supabase Storage](https://supabase.com) — 1GB free | No card; S3-compatible, so `config/filesystems.php`'s existing `s3` disk works against it unchanged. Backblaze B2 was tried first — see §2's note on why it was dropped |
| Admin + Student frontends | [Netlify](https://netlify.com) — 2 separate sites | No card; `netlify.toml` already in both `admin/` and `student/` |

I can't create any of these accounts myself — that part's on you. Once each exists, hand me the
credentials (paste into `.env`/Render's dashboard directly where possible, same practice as the
Gemini key) and I'll wire everything else.

## Quick reference — exactly what to hand me, per account

Create accounts in this order (each later step needs values from the one before it). Paste
values directly into the relevant dashboard where noted — never into chat — same practice as the
Gemini key.

1. **Aiven** (MySQL) → give me: host, port, database name, username, password.
2. **Supabase Storage** (sound storage) → give me: Access Key ID, Secret Access Key, bucket name,
   region, S3-compatible endpoint URL.
3. **Render** (API) → nothing to give me *from* Render itself — instead, you paste the values
   from steps 1-2 directly into Render's own env var dashboard (full list of which var gets which
   value is in render.yaml / step 3 below). Give me only: the resulting service URL once deployed
   (e.g. `https://clinova-api.onrender.com`).
4. **Netlify** (both frontends) → give me: the two resulting site URLs once both are deployed
   (e.g. `https://clinova-admin.netlify.app`, `https://clinova-student.netlify.app`) — I'll use
   these to update Render's `FRONTEND_URLS`/`SANCTUM_STATEFUL_DOMAINS`.

Full step-by-step for each, including exactly which Render env var each value maps to, below.

## 1. Aiven — MySQL

1. Create a free account, create a MySQL service (1GB plan).
2. From its overview page, copy: host, port, database name, username, password.
3. These five values go into Render's dashboard as `DB_HOST`, `DB_PORT`, `DB_DATABASE`,
   `DB_USERNAME`, `DB_PASSWORD` (see `render.yaml` — they're marked `sync: false`, meaning Render
   requires typing them in by hand, it won't pull them from this file).

## 2. Supabase Storage — sound file storage

**Why Supabase and not Backblaze B2:** B2 was tried first — free, no card, S3-compatible, looked
like a clean fit. Two real problems surfaced in practice: (1) B2 gates a bucket's first switch to
*public* visibility behind a one-time card-verification charge, so a private bucket + presigned
reads was built instead; (2) presigned reads then failed consistently against B2's S3-compatible
API — confirmed with raw SDK calls bypassing Laravel entirely, confirmed the key's capabilities
were correct, never resolved to a clear client-side cause. See `api/docs/ARCHITECTURE.md`'s
"Deployment — `SOUNDS_DISK`" section for the full blow-by-blow. Moved to Supabase Storage instead —
same free-no-card S3-compatible shape, and critically, **public buckets are a normal first-class
option there** (not card-gated), which sidesteps the entire presigned-URL question.

1. Create a free account (GitHub or email, no card).
2. Create a project (it also provisions a Postgres database — ignored here, this deployment keeps
   using Aiven/MySQL; only Storage is used from Supabase).
3. **Storage** → create a bucket (any name, e.g. `clinova-sounds`) — toggle **Public bucket** on.
   This only affects reads; uploads/deletes still require authorization via Supabase's RLS
   policies, so going public doesn't weaken write security. `Sound::resolvedUrl()` uses a plain
   `->url($path)` for this reason — no presigned/temporary URL involved at all.
4. **Project Settings → Storage → S3 Connection** — enable it. This generates an Access Key ID +
   Secret Access Key (shown once), and shows the S3-compatible endpoint + region.
5. Maps to Render env vars:
   - `AWS_ACCESS_KEY_ID` = the Access Key ID
   - `AWS_SECRET_ACCESS_KEY` = the Secret Access Key
   - `AWS_BUCKET` = your bucket name
   - `AWS_DEFAULT_REGION` = the region shown on the S3 Connection page
   - `AWS_ENDPOINT` = the full S3-compatible endpoint URL
   - `AWS_USE_PATH_STYLE_ENDPOINT` = `true`
   - `SOUNDS_DISK` = `s3`

**Known caveat:** Supabase's free-tier projects pause after 7 days with zero activity (one-click
resume from the dashboard, no data loss — not a concern once the app has real traffic, worth
knowing for a quiet demo/student deployment).

## 3. Render — the API

1. Create a free account, connect your GitHub, pick the `bobby3J/clinova` repo.
2. Render should detect `render.yaml` and offer to create the blueprint — if not, create a new
   Web Service manually with: Environment = Docker, Dockerfile path = `api/Dockerfile`, Docker
   build context = `api/`, Root directory = `api`.
3. Fill in every env var `render.yaml` marks `sync: false`:
   - `APP_KEY` — generate one locally first: `php artisan key:generate --show` (prints it without
     writing to `.env`), paste the output in.
   - `APP_URL` — Render gives you the service's URL once created (e.g.
     `https://clinova-api.onrender.com`); come back and set this after the first deploy.
   - The five `DB_*` values from Aiven (step 1).
   - The six B2/`AWS_*` values + `SOUNDS_DISK` (step 2).
   - `FRONTEND_URLS` and `SANCTUM_STATEFUL_DOMAINS` — placeholder for now
     (`https://placeholder.netlify.app`), real values come after step 4.
   - `GEMINI_API_KEY` — the same key already in your local `api/.env`.
4. Deploy. First boot runs migrations automatically (`docker/entrypoint.sh`) — if it crash-loops,
   check the logs; a migration failure there almost always means the `DB_*` values are wrong, not
   a code problem.
5. Confirm `https://<your-service>.onrender.com/up` returns 200.

**Known free-tier trade-off:** the service sleeps after ~15 minutes of no traffic; the next
request wakes it, taking 30-50s. Not a bug, just what free costs here — mention it if a demo's
first load seems to hang.

## 4. Netlify — both frontends

Two separate sites, same account, pointing at the same repo but different base directories.

**Both `netlify.toml` files proxy `/api/*` and `/sanctum/*` straight through to the Render API**,
hardcoded to `https://clinova-hzbk.onrender.com` — update that hostname in both files if your
Render service URL differs. This is load-bearing, not an optimization: Sanctum's CSRF flow sets an
`XSRF-TOKEN` cookie that the frontend has to read back out of `document.cookie` client-side (see
`src/lib/api.ts`'s `readXsrfTokenCookie()`) to send as the `X-XSRF-TOKEN` header. A cookie set by a
*different* origin (the bare Render URL) is never visible to `document.cookie` on the Netlify
page at all — that's the browser's same-origin policy, not a CORS/SameSite setting anything on the
server can relax. Confirmed broken for real in a browser (419 "CSRF token mismatch" on login)
*after* curl-based testing against the direct Render URL had falsely "passed" — curl pulls a
cookie straight out of its own jar and injects it as a header, which is exactly the cross-origin
read a real browser's JS can never do. Proxying through Netlify's own domain makes the browser's
actual request same-origin, so the cookie lands on this domain and `document.cookie` can read it.

**Admin:**
1. New site from Git → pick the repo → Base directory: `admin` (the rest comes from
   `admin/netlify.toml`: build command `npm run build`, publish `dist`, plus the two proxy
   redirects above).
2. Site configuration → Environment variables → add `VITE_API_URL` =
   `https://<this-site's-own-netlify-url>/api` and `VITE_API_ORIGIN` =
   `https://<this-site's-own-netlify-url>` — **this site's own domain, not Render's** (the proxy
   redirect is what actually reaches Render; pointing the frontend at Render directly defeats the
   whole point and brings back the cross-origin cookie problem).
3. Deploy. Note the resulting URL (e.g. `https://clinova-admin.netlify.app`) — if it differs from
   what's hardcoded in `admin/netlify.toml`'s redirects, that's fine (the redirect target is the
   *API*, not this site), but double check `VITE_API_URL`/`VITE_API_ORIGIN` match this site's own
   final URL exactly.

**Student:** same steps, Base directory `student`, same two env vars pointed at student's own
Netlify URL (not Render's, not admin's).

## 5. Close the loop — CORS and cookies

Both frontend URLs now exist — go back to Render and update:
- `FRONTEND_URLS` = `https://clinova-admin.netlify.app,https://clinova-student.netlify.app`
  (your real URLs, comma-separated, exact scheme/host, no trailing slash)
- `SANCTUM_STATEFUL_DOMAINS` = `clinova-admin.netlify.app,clinova-student.netlify.app`
  (host only, no scheme — same convention `SANCTUM_STATEFUL_DOMAINS` already uses locally)

Redeploy the API for these to take effect. These still matter even with the Netlify proxy in
place: Laravel sees the browser's real `Origin` header (Netlify relays it unchanged), and CORS/
Sanctum's stateful-domain check both key off that.

**Why `SESSION_SAME_SITE=none` + `SESSION_SECURE_COOKIE=true` (already set in `render.yaml`):**
left as `none`/`Secure` rather than tightened to `lax` now that the proxy makes requests look
same-origin to the browser — `None` is simply the more permissive setting (it still allows a
same-origin request to set/send the cookie fine), so there's no correctness reason to narrow it,
and leaving it means the API still works if anything ever calls it directly, unproxied.

## Not yet verified

I don't have Docker available in this environment, so `api/Dockerfile` has been reviewed
carefully but never actually built end-to-end before being handed over — unlike nearly everything
else in this project, which was verified live before being called done. The first real build
happens on Render itself. If it fails, paste me the build log and I'll fix it from there.
