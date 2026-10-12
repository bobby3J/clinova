# Clinova Admin — Starting Point

Last updated: 2026-10-06 (lecturer role — a second, scoped-down console role with its own role-aware auth gate/nav, a new Lecturers management page, and exam tips as a new StudyMaterial type)

## 1) What this project is

This is the **Clinova admin console**: a React + TypeScript + Tailwind CSS (v4) SPA that talks to
the Clinova Laravel API (`../api`) over a Sanctum cookie-session. It was bootstrapped from a
TailAdmin-derived template (previously rebranded "Black Leopard Technologies" in an unrelated
project); that template's demo pages, bearer-token auth, and multi-subdomain handoff flow have
been stripped out and replaced with Clinova's real auth and domain pages.

Stack:

- `react-router` v7 for routing
- Context API for auth, theme, and sidebar state
- ApexCharts for charts
- Fetch-based API client (`src/lib/api.ts`) — no axios

Entry point flow:

`src/main.tsx` -> `ThemeProvider` + `AppWrapper` -> `src/App.tsx` -> `AuthProvider` -> routes ->
`AuthGate` -> `AppLayout` (sidebar/header shell).

## 2) Current route map

Defined in [`src/App.tsx`](./src/App.tsx):

- `/signin` -> `SignIn` (outside `AuthGate` — no session required)
- Everything else is behind `AuthGate` (admin OR lecturer now, not admin-only — see §2a) + `AppLayout`:
  - Admin + lecturer, full parity: `/study-library` -> `StudyLibrary`, `/flashcards` -> `Flashcards`,
    `/settings` -> `Settings`, `/profile` -> `Profile`
  - Admin-only (wrapped in `RequireRole roles={["admin"]}` — see §2a): `/` -> `Dashboard/Home.tsx`,
    `/sounds` -> `SoundLibrary`, `/users` -> `Users`, `/lecturers` -> `Lecturers` (new),
    `/announcements` -> `Announcements`, `/activity-log` -> `ActivityLog`
- `*` -> `NotFound`

**Every page in the route map is fully functional** — `Profile`, `SignIn`, `Dashboard/Home.tsx`,
`StudyLibrary`, `Flashcards`, `SoundLibrary`, `Users`, `Lecturers`, `ActivityLog`, `Announcements`,
and `Settings`. No `PlaceholderPage` usages remain anywhere in `src/pages`. See below for what each
one does and the patterns worth reusing from it.

### 2a) The lecturer role — the first fork of this app's permission model

Added 2026-10-06. Until now this console had exactly one role that mattered (`admin` — students
never reach past `AuthGate`); lecturers are a second, narrower one who can manage Study Library
content and Flashcards but not users/announcements/activity-log/analytics/sounds. The guiding
principle was **reuse, not duplicate**: one SPA, made role-aware, rather than a second forked
project that would start drifting from the first the moment either one changed.

- `src/types/auth.ts` — `isLecturer()` alongside the existing `isAdmin()`.
- `src/components/auth/AuthGate.tsx` — now admits admin **or** lecturer (`isAdmin(user) ||
  isLecturer(user)`), not admin-only. This only answers "is this account allowed in the console at
  all."
- `src/components/auth/RequireRole.tsx` — new, narrower gate nested inside `AuthGate` for the six
  admin-only routes. Redirects a lecturer who types `/users` (etc.) directly into the URL bar to
  `/study-library` instead of showing a broken page — the backend already 403s them at the API
  layer; this is purely about not showing a dead fetch-error screen for something the nav already
  hides.
- `src/layout/AppSidebar.tsx` — `NavItem` gained an optional `roles?: ("admin" | "lecturer")[]`;
  omitted means visible to both. `getVisibleNavItems(user)` is exported so `AppLayout`'s
  `MobileBottomNav` filters the *same* way before slicing its first 5 — slicing the raw array first
  would leak admin-only items into a lecturer's mobile bottom nav.
- **Confirmed zero changes needed** in `StudyLibrary.tsx`/`Flashcards.tsx` themselves — the backend
  gives lecturers full parity on those two domains (see `api/docs/ARCHITECTURE.md`'s new role-model
  section), so there's no role-conditional UI to add inside pages that already work identically for
  both roles.

**New admin-only page: Lecturers** (`src/pages/Lecturers/Lecturers.tsx`) — modeled directly on
`Users.tsx`'s pagination pattern (§Users below), minus track/level/streak (student-only concepts).
The one real difference: there's no self-registration path for lecturers the way there is for
students, so this page also has a create flow (`LecturerFormModal.tsx` + `POST /admin/lecturers`)
that `Users.tsx` never needed. `src/lib/lecturers.ts` reuses the existing `AdminUser` type —
no new type file, since the backend's `LecturerManagementController` reuses the same
`AdminUserResource` `UserManagementController` does.

`Dashboard/Home.tsx` fetches `GET /admin/analytics/overview` on mount (`src/lib/analytics.ts`,
`src/types/analytics.ts`), with a loading skeleton per tile, an error state with retry, and a
manual refresh button + "Updated HH:MM" timestamp since it's a live snapshot rather than a static
resource. A personalized "Welcome back, {firstName}" header reads straight from `useAuth()` — no
extra fetch, it's the same user object the rest of the app already has. Each tile has its own
icon and accent color (brand/blue-light/warning/success) rather than being visually uniform.

Below the tiles are three charts fed by `getAllAdminUsers()` (`src/lib/users.ts`,
`src/types/users.ts`), all computed client-side from the same already-fetched full student list —
no new backend endpoint needed for any of the three:
- `TrackDistributionChart.tsx` — a donut of students by track (nursing/midwifery/unset).
- `SignupsTrendChart.tsx` — a bar chart of daily signups over the last 30 days, bucketing
  `created_at`. Deliberately bars, not a line — these are discrete daily counts (often 0), and a
  line would visually imply a continuous trend that isn't really there.
- `StreakDistributionChart.tsx` (added 2026-10-05) — a bar chart of students bucketed into five
  engagement stages by `streak_count` (0 / 1–2 / 3–6 / 7–29 / 30+ days). The bucket edges are a
  judgment call about what reads as informative to an admin (just-started vs. habit-building vs.
  highly-engaged), not a derived statistic like quartiles would be.

Below those is a fourth chart, **`StudyActivityChart.tsx` (added 2026-10-05)** — a smoothed area
chart of total completed-session minutes per day over the last 30 days. This one *can't* be
computed client-side from the admin user list the way the other three are — it needs
`StudySessions` rows, which the Users endpoint never includes — so it's backed by a genuinely new
backend aggregate endpoint: `GET /admin/analytics/study-activity?days=` →
`GetStudyActivityOverTimeAction` (`api/app/Domain/Admin/Actions/`), same one-Action-class-per-
analytics-use-case shape as `GetOverviewMetricsAction`. The action groups by `DATE(started_at)` in
SQL (not by pulling every session row into PHP) and zero-fills every day in the window server-side
before returning, so the response is always exactly `days` entries, oldest first, with no "missing
day" for the frontend to re-derive. `src/lib/analytics.ts`'s `getStudyActivityOverTime()` and
`src/types/analytics.ts`'s `StudyActivityDay` wrap it. It has its own load/error state in
`Home.tsx`, independent from the other three charts' `students` fetch, since it reads a completely
different table and a failure in one shouldn't take the other down.

All four chart components are lazy-loaded (`React.lazy` + `Suspense` in `Home.tsx`) because
ApexCharts is ~250KB gzipped and nothing else in the app uses it — without lazy-loading it would
bloat every page's bundle, not just the dashboard's. There's no route-level code-splitting anywhere
else in this app yet; this is scoped to just these four components, not a precedent to copy
blindly elsewhere unless another page adds a similarly heavy dependency.

The seed data was deliberately enriched for these charts: `api/database/seeders/DatabaseSeeder.php`
now creates 18 extra students (on top of the original 1) with randomized `track`, `streak_count`,
and `created_at` spread across the last 30 days — otherwise both charts would render correctly but
look empty/broken with only one real student in the dev database. Re-running
`php artisan migrate:fresh --seed` in `../api` regenerates this; it's local dev data only.

`StudyLibrary` is ahead of the rest: it's wired to the real backend, not a mockup or a bare
`PlaceholderPage`. It fetches subjects, then topics per subject, then materials lazily per
selected topic (`src/lib/studyLibrary.ts` — see that file's top comment for why there's no single
call that returns the full tree, and `src/types/studyLibrary.ts` for the real response shapes,
both built from `../api/docs/API_REFERENCE.md` §StudyLibrary). It has real loading skeletons,
real error states with retry, and three distinct empty states. Track tabs, topic selection, and
search are all real client-side state over real fetched data.

`StudyMaterial`, `Subject`, and `Topic` all have full CRUD now (`MaterialFormModal.tsx`,
`SubjectFormModal.tsx`, `TopicFormModal.tsx` each handle both create and edit, with field-level
validation errors surfaced from the backend's 422 responses). Subject/Topic started as Create +
Read only — the backend genuinely had no `PATCH`/`DELETE` route for either — until a user
complaint ("can't edit or delete, is that fair?") prompted adding the missing backend routes,
controller methods, and policy checks (same shape as `StudyMaterialController`/
`StudyMaterialPolicy`) in the same pass as the frontend edit/delete UI. Deleting either cascades
to its children at the DB level; the delete confirmation names what else gets removed (e.g. "this
also deletes its 3 topics and every material inside them").

`src/pages/StudyLibrary/StudyLibrary.tsx` is the reference pattern for wiring every other page:
see `REACT_REENTRY_API_GUIDE.md` §4.

**Exam tips, added 2026-10-06**: a fourth `StudyMaterial` type, `tip` — text-based like `note`
(body, no url/duration), not a new table. Lecturer-authored exam tips are just another material
type in the same draft/publish workflow everything else here already has, browsable per-topic like
any other material. `MaterialFormModal.tsx`/`MaterialDetailModal.tsx`'s old `type === "note"`
branches (body-vs-url field, which label to show) needed `tip` folded in alongside `note` — both
are "text-based," the real distinction was never "note specifically," that just happened to be the
only text-based type that existed yet. Both `TYPE_ICON: Record<MaterialType, ...>` maps also
needed a `tip` entry or TypeScript's exhaustiveness check on that `Record` fails the build; reused
`AlertIcon` rather than adding a new SVG asset (this codebase has a documented history of new icon
SVGs silently rendering invisible — see the icon gotcha in §6 of `REACT_REENTRY_API_GUIDE.md`).

### Flashcards

Wired the same way as Study Library, with one deliberate difference: **Subjects/Topics are
read-only here** (`src/pages/Flashcards/Flashcards.tsx`'s left panel reuses
`getSubjects()`/`getTopics()` from `src/lib/studyLibrary.ts`, but renders no add/edit/delete
affordances). That management already lives on the Study Library page — Subject/Topic are shared
curriculum structure referenced by both `StudyMaterial` and `FlashcardDeck`, not owned by either
domain, so duplicating that CRUD here would just be a second place to maintain the same data.

Decks (`src/lib/flashcards.ts`, `src/types/flashcards.ts`) have full CRUD + Publish, same as
StudyMaterial. Cards are managed inside a deck via `DeckCardsModal.tsx` — click a deck's card
count to open a focused add/edit/delete view for just that deck's cards, rather than cramming a
third browser column onto the page.

Deck/Card full CRUD was added to the backend in the same pass as this page (previously Create +
Read only, plus Publish for decks) — same reasoning and shape as the Subject/Topic addition above.
While verifying it against the real API (not just PHPUnit), found and fixed two real bugs: a
fresh instance of the "`Model::create()` doesn't reflect DB defaults" gotcha (`order` came back
`null` instead of `0` on `Flashcard` *and*, once audited, on `Topic` too — see
`api/docs/ARCHITECTURE.md`'s Models section for the full story and the fix).

### Sound Library

The simplest of the three wired domains — flat list, no Subject/Topic hierarchy at all
(`src/lib/soundLibrary.ts`, `src/types/soundLibrary.ts`). No draft/published workflow either: a
sound is just active or inactive. Category/status filter pills + a search box over the one
already-fetched list, all client-side (the dataset is small; no reason to ask the backend to
filter what's already in memory).

Added full CRUD-minus-delete to the backend in this pass: `PATCH /sounds/{id}` for editing
metadata (name/category/file_url/source/license) was missing entirely before this. **Delete was
deliberately not added** — unlike Subject/Topic/Deck, this isn't a gap: `SoundController`'s
existing `activate`/`deactivate` comment already explained why (`study_sessions.sound_id` is
`nullOnDelete`, so retiring a sound is meant to go through deactivation, preserving the link to
past sessions, not deletion). Confirmed that reasoning against the actual migration before
deciding not to add delete, rather than assuming the comment was still accurate.

`SoundFormModal.tsx`'s category field uses a native `<datalist>` for suggestions (Nature, Music,
Noise, Ambient) rather than a hard enum — `category` is free-text on the backend
(`StoreSoundRequest`), so the UI shouldn't pretend otherwise. This needed a small addition to the
shared `Input` component (`src/components/form/InputField.tsx`) — it didn't forward a `list` prop
to the underlying `<input>` before now.

**File upload added after initial wiring**, in response to a user request ("upload from my
device, not just a URL" + "let me play it"). This was a real gap, not just frontend wiring — the
backend had never accepted a file at all, `file_url` was strictly paste-a-URL by design. Added:

- `StoreSoundRequest`/`UpdateSoundRequest`: `audio_file` alongside `file_url`
  (`required_without` each other on create; both `sometimes` on update, since an edit might not
  touch the audio at all). `SoundController` stores the upload on the `public` disk and derives
  `file_url` from it (`Storage::disk('public')->url(...)`) — paste-a-URL and upload-a-file
  converge on the same column, the rest of the app never needs to know which one happened.
- `src/lib/api.ts`'s `apiFetch` now detects a `FormData` body and skips JSON-encoding it — and,
  for `PATCH` specifically, spoofs it as `POST` with an appended `_method=PATCH` field. This isn't
  a Laravel quirk, it's a PHP one: the native multipart parser only ever populates `$_FILES` for a
  real `POST`, so a real `PATCH` with a file body silently loses the file before any framework
  code runs. `createSoundWithFile()`/`updateSoundWithFile()` in `src/lib/soundLibrary.ts` are the
  FormData-carrying siblings of the existing JSON `createSound()`/`updateSound()`.
- `SoundFormModal.tsx` gained a "Paste URL" / "Upload file" toggle, with client-side size
  (20MB) and extension checks mirroring the backend's `mimes:`/`max:` rules, so a bad file is
  rejected immediately instead of after a round trip.
- **Local dev gotcha, not just a reminder — the server needs an env var set now.** PHP's default
  `upload_max_filesize` (2M) is too small for real audio files. `api/public/.user.ini` raises it to
  20M, but **`php artisan serve` doesn't honor `.user.ini`** (only Apache/PHP-FPM do — the
  built-in dev server PHP ships doesn't scan for it at request time). Start the API with:
  ```
  PHP_INI_SCAN_DIR="$(pwd)/.phpini" php artisan serve --no-reload
  ```
  — `api/.phpini/uploads.ini` holds the same two directives, and `PHP_INI_SCAN_DIR` is a real PHP
  startup mechanism (not FPM/Apache-specific) that `artisan serve` only forwards to its child
  process when `--no-reload` is passed. Verified with a real 3MB upload over actual HTTP, not
  assumed. See `api/docs/ARCHITECTURE.md`'s matching section for the full story (found by
  uploading a real file over real HTTP and getting a cryptic failure the test suite couldn't have
  caught, since PHPUnit's `UploadedFile::fake()` never goes through real PHP upload-size
  enforcement at all) — including a separate gotcha for whenever this gets deployed behind Nginx,
  which has its own independent 1MB upload cap unrelated to PHP's.

**Playback**: each sound card has a Play/Pause button, backed by one shared `<audio>` element
(`audioRef` in `SoundLibrary.tsx`) rather than one per card — only one sound should ever play at
once, and reusing a single element means switching sounds doesn't leave the previous one still
loaded in the background.

### Users

The quickest of the wired pages to build — `src/lib/users.ts` and `src/types/users.ts` already
existed (built for the Dashboard's track-distribution/signup charts), so this was mostly writing
the page itself: `suspendUser()`/`reactivateUser()` were the only two functions actually added.

Table, not cards — unlike Sound Library's grid, a list of students with several comparable fields
(track, level, streak, status, joined date) reads better as rows. Track + status filter pills and
a name/email search, all client-side.

**Paginated as of 2026-10-05** (`UserManagementController::index()`, 25/page, capped at 100 via
`?per_page=`) — the only list in the app besides Activity Log that genuinely grows with real usage
(every student signup adds a row; curated content like Subjects/Sounds stays admin-sized). The
table itself (`getAdminUsers(page)` in `src/lib/users.ts`) fetches one page at a time with real
Previous/Next controls reading `meta.current_page`/`meta.last_page`/`meta.total`. The roll-up tiles
above the table (Total/Active/Suspended) still need the *whole* population to be accurate, though
— `getAllAdminUsers()` (same file) transparently walks every page and concatenates, capped at 20
page-fetches as a runaway-loop guard. That's a deliberate exception to "paginate for scale": the
tiles are cheap arithmetic over already-fetched JSON, while the table avoiding pagination was
specifically about not mounting thousands of `<tr>`s into the DOM — different costs, different
tradeoffs. The Dashboard's two student-driven charts (track/streak distribution, signup trend)
reuse the same `getAllAdminUsers()` for the same reason.

**Known, accepted tradeoff:** the track/status filter pills and name/email search only ever run
against the currently-loaded page's rows, not the full student list — searching for a student on
page 3 while viewing page 1 won't find them. There's no "search all students" backend endpoint to
back a smarter UI, and building one felt like scope creep beyond what pagination itself asked for.
The page shows a small note ("Filtering this page only…") whenever a filter is active and there's
more than one page, so this is visible rather than silently confusing. If this ever becomes a real
problem, the fix is a backend search param on `GET /admin/users`, not more client-side cleverness.

**This page only shows what the backend actually supports, which is less than the old template
assumed.** The previous (pre-Clinova) version of this page had a full create-user form with role
assignment — none of that exists here: students self-register, admins never create accounts, and
`UserManagementController::index()` only ever returns students (`User::role('student')->get()`),
never other admins. The only write actions are suspend and reactivate — no edit, no delete. This
isn't a gap like Subject/Topic's was; there's no comment explaining an intentional omission this
time because there's nothing to omit — editing a student's own profile fields isn't an admin
console concern, and account deletion was never part of the product's design (Sound Library's
suspend-not-delete reasoning applies here even more directly: deleting a student would blow away
every record that references them).

Suspending asks for confirmation (it revokes every session the student is currently in — a real,
immediate, user-facing effect); reactivating doesn't, since it's non-destructive and fully
reversible.

**Sibling page, added 2026-10-06: `Lecturers`** (`src/pages/Lecturers/Lecturers.tsx`,
`src/lib/lecturers.ts`) — same table/pagination/suspend-reactivate shape as this page, minus
track/level/streak (student-only concepts), reusing the same `AdminUser` type since the backend's
`LecturerManagementController` reuses the same `AdminUserResource`. The one real difference: there
*is* a create flow here (`LecturerFormModal.tsx` + `POST /admin/lecturers`), because unlike
students there's no self-registration path for lecturers — someone has to create the account.
`email_verified_at` is set immediately on creation (the admin creating it is already vouching for
it) — see `api/docs/ARCHITECTURE.md`'s role-model section for a real mass-assignment gotcha this
surfaced (`email_verified_at` isn't in `User`'s `#[Fillable(...)]` list, so passing it inside
`User::create([...])` silently no-ops; fixed with `forceFill()` after the fact).

### Activity Log

No backend changes needed initially — `GET /admin/activity-log` already existed, fully tested, pure
read-only. Purely a frontend build: `src/types/activityLog.ts`, `src/lib/activityLog.ts`, the page.

**Paginated as of 2026-10-05** (`ActivityLogController::index()`, 20/page, capped at 100) — this
was the first list in the app to get server-side pagination, specifically because it's the one
genuinely unbounded list: every logged admin action adds a row, forever, with no curation step.
Same Previous/Next pattern as Users (`getActivityLog(page)` in `src/lib/activityLog.ts`), and the
same accepted tradeoff — the action-type filter pills and description/admin search only see the
current page's entries, with the same "Filtering this page only…" note shown when that matters.
Unlike Users, there's no full-population fetch here for anything else on this page to stay
accurate against (no roll-up tiles on this page), so this one's simpler: just the table and its
pagination controls.

`action` is free-text on the backend, not an enum, so `ActivityLog.tsx`'s `ACTION_CONFIG` map
(which known actions get a nice label/icon/color) is deliberately non-exhaustive —
`humanizeAction()` + a generic fallback icon handle anything not in the map, snake_case turned
into Title Case. The five known values were found by grepping `action: '...'` across
`app/Domain`, not guessed: `published_study_material`, `published_flashcard_deck`,
`suspended_user`, `reactivated_user`, `broadcast_announcement` — all fired from a dedicated Action
class via the shared `AdminActionPerformed` event (see `api/docs/ARCHITECTURE.md`).

**Curriculum deletes are now logged too (2026-10-05).** `SubjectController`, `TopicController`,
`FlashcardDeckController`, and `FlashcardController`'s `destroy()` methods each now fire
`AdminActionPerformed` directly (`deleted_subject`, `deleted_topic`, `deleted_flashcard_deck`,
`deleted_flashcard`), same pattern as the five actions above — no new Action class needed since
`destroy()` already *is* the single place the state change happens, unlike e.g. publish which has
its own dedicated Action. Deliberately **deletes only, not updates**: a delete is a real,
consequential, hard-to-reverse event worth an audit trail; a routine edit (fixing a typo in a
material's body, nudging a card's `order`) isn't a "meaningful state transition" by the same
standard the existing five actions (publish, suspend, broadcast) were held to, so logging it would
just add noise without adding signal. Sound has no delete at all (see that section above), so
there's no `deleted_sound` action. Each `destroy()` method's description names the deleted item
(e.g. `Deleted subject "Maternal Health"`) so the log entry is useful without a follow-up query.

### Announcements

The odd one out — every other wired page follows `types/<domain>.ts` → `lib/<domain>.ts` →
fetch-and-render page, because every other domain has a `GET` to fetch. This one doesn't:
`POST /admin/announcements` is the *only* endpoint, fire-and-forget (it writes a database
notification directly to each matching student's own `notifications` row — nothing persisted
anywhere an admin can query back). So the page is a compose form, not a list view.

Two things worth knowing if this pattern comes up again:

- **`ApiResponse<T>` wasn't enough.** The generic type (`src/types/common.ts`) is just
  `{ data: T }`, but this endpoint also sends a `message` ("Announcement sent.") worth showing —
  `BroadcastAnnouncementResponse` in `src/types/announcements.ts` is its own response shape
  instead of silently dropping that field.
- **"Sent this session" is real but deliberately not a history.** Since there's no backend list
  endpoint, the page keeps a local React array of what it actually sent (title, target
  description, the real `recipient_count` the backend returned) — genuine data, not fabricated,
  but it clears on refresh and the heading says "this session" on purpose so it's never confused
  with a persisted audit trail. If a real history is ever wanted, that's new backend work (an
  `announcements` table + a `GET` endpoint), not something the frontend can fake its way into.

Verified against the live API: an unfiltered send reached all 19 seeded students, a
track-filtered send reached exactly the 12 nursing students from the Dashboard's seed data —
exact match, confirming the `track` filter works correctly end to end.

### Settings

**Every page is now wired — this was the last one.** Scoped to the admin's own account, by
explicit decision after checking the backend first: there is no platform-wide settings concept
anywhere in it (no feature flags, no global config table). The only thing named "settings" at all
is `user_settings` — one row per student, their own focus-timer preferences (duration, default
sound, auto-breaks) — a future student-app concern, not an admin console one. Rather than invent a
speculative platform-config schema, Settings does the one thing every admin console genuinely
needs: change your own password.

This needed a real backend addition — no authenticated "change my own password" endpoint existed
before this (only the guest forgot-password-via-email flow). Added, matching existing patterns
exactly rather than inventing new ones:

- `UpdatePasswordRequest` uses Laravel's built-in `current_password` validation rule (verifies
  against the authenticated user's actual password, no manual `Hash::check()`) and the same
  `['required', 'confirmed', Rules\Password::defaults()]` shape `RegisteredUserController`/
  `NewPasswordController` already use for a new password.
- `PasswordController` (in `app/Domain/Users/Http/Controllers/`, not the `Auth/` subfolder — this
  requires already being logged in, unlike every controller in `Auth/`) is a new, separate
  controller from `Auth\NewPasswordController`, which handles the guest email-token reset flow.
  Same underlying concern (changing a password), two genuinely different flows with different
  preconditions — kept as two controllers rather than one branching on "is there a token."
- `PUT /user/password` — new route in `app/Domain/Users/routes.php`, which also meant adding
  `apiPut` to `src/lib/api.ts`'s client (only `apiGet`/`apiPost`/`apiPatch`/`apiDelete` existed
  before; nothing had needed `PUT` yet).

Verified end to end with real curl, including an easy mistake to make when testing against a
real account: after confirming the new password worked (a fresh login with it, not just a 204 on
the update call), the admin's password was reverted back to the documented dev credential
(`admin@example.com` / `password`) via `forceFill()` in Tinker — leaving it changed would have
broken every other doc and script in this project that assumes that credential still works.

## 3) Auth model (read this before touching anything auth-related)

Clinova's API uses **Sanctum SPA cookie-session auth**, not bearer tokens. There is no token
stored anywhere in the frontend.

- `src/lib/api.ts` — `ensureCsrfCookie()` hits `GET /sanctum/csrf-cookie` before any mutating
  request, then every `apiFetch` call sends `credentials: "include"` and reads the `XSRF-TOKEN`
  cookie to set the `X-XSRF-TOKEN` header manually (no axios interceptor magic).
- `src/lib/auth.ts` — `login()`, `logout()`, `getCurrentUser()` wrap the `/login`, `/logout`,
  `/api/user` endpoints.
- `src/context/AuthContext.tsx` — `AuthProvider`/`useAuth()` holds the current user, loading
  state, and exposes `login`/`logout`. This is the only source of truth for "who is logged in."
- `src/components/auth/AuthGate.tsx` — gates all non-`/signin` routes. Handles three states:
  loading (session check in flight), no user (redirect to `/signin`), and user-but-not-admin
  (this console is admin-only — see `src/types/auth.ts`'s `isAdmin()`).

There is intentionally no tiered "superadmin" role. Clinova's backend only has `student` and
`admin` roles (Spatie permission), and this console is admin-only, so by the time anyone reaches
the sidebar they're an admin.

## 4) Folder structure (what matters most)

- `src/pages`: route-level screens, one folder per domain.
- `src/layout`: app shell (`AppLayout`, `AppSidebar`, `AppHeader`, `Backdrop`). `AppLayout` also
  renders `components/MobileBottomNav.tsx`, which reuses the first 5 entries of `AppSidebar`'s
  exported `navItems` array for the small-screen bottom bar — keep that array exported if you
  touch `AppSidebar.tsx`.
- `src/components`:
  - `auth/AuthGate.tsx` — route guard described above.
  - `common/PlaceholderPage.tsx` — shared "not wired yet" page shell; shows the endpoint it'll
    eventually call so nothing is a mystery stub.
  - `header/`, `UserDropdown.tsx`, `NotificationDropdown.tsx` — app header widgets.
  - `ui/*` — generic presentational primitives (dropdown, modal, etc.) kept from the template.
- `src/context`: `AuthContext`, `ThemeContext`, `SidebarContext`.
- `src/lib`: `api.ts` (the one generic fetch client + CSRF handling), plus one small module per
  domain, each exporting named functions that wrap it — `auth.ts`, `studyLibrary.ts`,
  `analytics.ts`, `users.ts`, `lecturers.ts`. Pages call these, never `apiGet`/`apiPost` directly
  once a domain module exists (see `REACT_REENTRY_API_GUIDE.md` §4–5 for why).
- `src/types`: `auth.ts` (`AuthUser`, `isAdmin()`, `isLecturer()`), `common.ts` (`ApiResponse<T>`,
  `ApiListResponse<T>`, `ApiPaginatedResponse<T>`, `ApiValidationError`, `ApiError`), plus one file
  per domain (`studyLibrary.ts`, `analytics.ts`, `users.ts` — `lecturers.ts` deliberately has no
  type file of its own, reusing `users.ts`'s `AdminUser`). These mirror the shapes documented in
  `../api/docs/API_REFERENCE.md` (or the backend `Http/Resources/*.php` directly when the doc is
  ambiguous) — the backend is the contract; these types implement it.
- `src/index.css`: Tailwind theme tokens + utility classes. Brand color (`--color-brand-*`) is
  Clinova teal (`500` = `#0e7c6b`), not the template's original blue.
- `public/images/logo/clinova-mark.svg`: the only logo asset now in the repo — used in sidebar,
  header (mobile), and as the favicon (`index.html`).

## 5) Cleanup completed in the Clinova rebrand pass

### Removed (wrong-project leftovers)

- Pages: `Clients`, `Applications`, `Payments`, `Requests`, `Notifications`, old `Users`,
  `UserProfiles` — these belonged to the unrelated prior project's domain, not Clinova.
- `src/components/UserProfile/` — same reason.
- `src/lib/elevatedUsers.ts`, `src/lib/profile.ts` — implemented the old bearer-token /
  subdomain-handoff auth pattern, incompatible with Sanctum sessions.
- Logo assets: `black_leopard_logo.PNG` and five `cilt-*` files, replaced by `clinova-mark.svg`.
- Unused dependencies from `package.json`: `@fullcalendar/*`, `@react-jvectormap/*`,
  `react-dropzone`, `flatpickr`/`react-flatpickr`, `tailwind-merge`.

### Rebuilt for Clinova

- Full auth layer: `lib/api.ts`, `lib/auth.ts`, `context/AuthContext.tsx`,
  `components/auth/AuthGate.tsx`, `pages/AuthPages/SignIn.tsx` (this page didn't exist before).
- `layout/AppSidebar.tsx`: flat 8-item nav, no role tiers, Clinova branding.
- `layout/AppHeader.tsx`: fixed logo paths, dropped ~185 lines of dead commented-out code.
- `components/header/UserDropdown.tsx`: now reads `useAuth()`, one real `/profile` link instead
  of three duplicate menu items.
- `pages/Profile/Profile.tsx`: renders real `useAuth().user` fields (not a template mock).
- `pages/Dashboard/Home.tsx`: 4 KPI tiles matching the real `GET /admin/analytics/overview` shape.
- `components/header/NotificationDropdown.tsx`: dropped the fabricated "Black Leopard" demo items
  (fake avatars, fake request/response threads) for an honest empty state — there's no admin-alert
  or student-feedback domain in the backend yet, so "View Activity Log" links to the real
  `/activity-log` route instead of a `/notifications` page that doesn't exist.
- `layout/AppSidebar.tsx`: removed the "Admin Console" section label above the nav list — redundant
  once the sidebar only ever shows admins one flat list (see the comment on `navItems`).
- `index.html`: title and favicon updated to Clinova.
- `.env` / `.env.example`: `VITE_API_ORIGIN`, `VITE_API_URL` pointing at the local Laravel API.
- `.gitignore`: added `.env` exclusions (previously had none).

## 6) What is still demo-only / not yet wired

- All eleven pages are fully wired; there is no `PlaceholderPage` usage left anywhere in this app.
- Editing curriculum content (Subject/Topic/Deck/Card/Sound) still doesn't write to the Activity
  Log — only deleting it does now (see the Activity Log section above). Whether routine edits
  should also be logged remains an open product question, not an oversight.
- A lecturer's own curriculum activity (publishes, deletes) *does* show up in the Activity Log
  automatically — that page's admin-only visibility, plus the fact `AdminActionPerformed` never
  checked role to begin with, means this came free with the role split rather than needing new code.
- `src/pages/UiElements/*`, `Charts/*`, `Forms/*`, `Tables/*` (if present) are template example
  pages, not part of the Clinova route map; fine to leave until a real need for one arises.

## 7) Best place to resume API integration

Study Library is the reference implementation now — follow its shape, don't reinvent it:

1. Build `src/types/<domain>.ts` from `../api/docs/API_REFERENCE.md`, matching the real Resource
   shapes (check the backend `Http/Resources/*.php` directly if the doc is ambiguous about what's
   conditional — `src/types/studyLibrary.ts`'s top comment shows why that mattered here).
2. Build `src/lib/<domain>.ts`: one named function per endpoint, wrapping `apiGet`/`apiPost`/etc.
   from `src/lib/api.ts`. Pages call these, not `apiGet` directly — see the discussion in
   `REACT_REENTRY_API_GUIDE.md` §4–5 for why.
3. In the page, replace the `PlaceholderPage` usage with real `useState`/`useEffect`, a loading
   skeleton, an error state with retry, and explicit (not generic) empty states.
4. `Dashboard/Home.tsx` is a second reference, and a simpler starting point than StudyLibrary if
   you want one read-only GET with no child resources first (`src/lib/analytics.ts`). It also
   shows three other patterns worth knowing before you need them: computing chart data
   client-side from an existing endpoint instead of asking the backend for new aggregation
   (`src/lib/users.ts` + `TrackDistributionChart.tsx`/`SignupsTrendChart.tsx`/
   `StreakDistributionChart.tsx`); the opposite call — adding a dedicated backend aggregate
   endpoint when the chart needs data the frontend has no other reason to fetch in bulk
   (`StudyActivityChart.tsx` + `GetStudyActivityOverTimeAction`); and lazy-loading a heavy
   dependency with `React.lazy`/`Suspense` so it doesn't bloat every page's bundle.
5. `Flashcards` is a third reference, and the one to read if a future page needs a modal nested
   inside another modal's flow (`DeckCardsModal.tsx` opens `CardFormModal.tsx` on top of itself)
   or needs to reuse another domain's already-built browser/fetch logic without duplicating its
   management UI (`Flashcards.tsx` reuses `getSubjects()`/`getTopics()` from
   `src/lib/studyLibrary.ts` read-only, since Subject/Topic management belongs on Study Library).
6. `SoundLibrary` is the simplest reference — flat list, no hierarchy, no draft/published
   workflow. A good one to read first if a future domain is similarly simple.
7. `Users` is a table-based reference, and the one to read for "don't rebuild what the old
   template assumed" — it had a full create-user-with-role-assignment form before, and none of
   that backend exists; the real endpoints only support list/suspend/reactivate.
8. `ActivityLog` is a one-endpoint, zero-backend-changes reference — the fastest possible wiring
   pass when the backend's already done, and the one to read for handling a free-text `action`
   field gracefully (`ACTION_CONFIG` map + a humanized fallback, not a hardcoded enum).
9. `Announcements` is a compose-form reference — no list/history endpoint exists, only
   `POST /admin/announcements`, so it doesn't follow the usual fetch-and-render shape every other
   page does. Read it for the "endpoint also returns a message, ApiResponse<T> wasn't enough"
   pattern and for how to represent real-but-not-persisted data honestly (its "sent this session"
   list, explicitly labeled as clearing on refresh, not a fake history).
10. `Settings` is the last reference, and the one to read for "check the backend before scoping a
    vague page" — rather than guess at a platform-config schema that doesn't exist, it does the
    one real thing every admin console needs (change your own password), which needed a genuine
    new backend endpoint (`PUT /user/password`, `src/lib/api.ts`'s `apiPut`) rather than frontend
    wiring against something already there.
11. `Lecturers` (added 2026-10-06, §2a) is the reference for making an existing page role-aware
    rather than forking it — `AuthGate`/`RequireRole`/`getVisibleNavItems()` are the pattern to
    follow the next time a role needs adding, not something to re-derive. It's also the reference
    for "a sibling page that's 90% identical to an existing one" — built by copying `Users.tsx`'s
    shape rather than starting from `PlaceholderPage`, with the one genuine difference (a create
    flow) added on top.

**All eleven pages are wired. There is no `PlaceholderPage` usage left anywhere in this app.** The
three deepening questions flagged two passes ago — curriculum-delete activity logging, pagination
for lists that grow, and richer Dashboard analytics — were addressed in the 2026-10-05 pass; the
lecturer role, exam tips, and lecturer account management were addressed in the 2026-10-06 pass,
both described throughout §2/§2a above. What's left to deepen is narrower now: curriculum *edits*
(not deletes) still aren't logged, and Users/Activity Log search only ever sees the current page
(both are documented, accepted tradeoffs above, not bugs). Otherwise the remaining work is a
genuinely new domain — the student-facing app, or `AiPractice` once that backend domain exists —
not another placeholder to wire.
