# Clinova Admin — React Reentry + API Integration Guide

Last updated: 2026-10-06 (lecturer role — role-aware auth gate/nav, a new Lecturers page, exam tips as a new StudyMaterial type)

This guide is for getting productive quickly in the Clinova admin console after a break. It
assumes the Laravel API (`../api`) is already built and documented — see
`../api/docs/API_REFERENCE.md` for every endpoint's exact request/response shape, and
`../api/docs/ARCHITECTURE.md` for how the backend is organized.

## 1) Mental model of this app

Think of the app in 6 layers:

1. Bootstrapping: `src/main.tsx`
2. Routing: `src/App.tsx`
3. Auth: `src/context/AuthContext.tsx` + `src/components/auth/AuthGate.tsx`
4. Shell layout: `src/layout/*`
5. Route pages: `src/pages/*`
6. Reusable UI/domain blocks: `src/components/*`

Data flows:

`page` -> `src/lib/<domain>.ts` (named endpoint functions) -> `src/lib/api.ts` (the one generic
fetch helper underneath all of them) -> typed response (`src/types/*`) -> component props -> UI
render.

## 2) How everything is connected

### Bootstrapping

In `src/main.tsx`:

1. Global CSS is loaded (`index.css`).
2. `ThemeProvider` wraps the app.
3. `AppWrapper` (Helmet provider) wraps routing.
4. `App` renders the router, auth provider, and pages.

### Auth — read this before anything else

Clinova's API is **Sanctum SPA cookie-session auth**, not bearer tokens. There is no token in
localStorage, no `Authorization` header in production code (Bearer tokens only ever appear in
backend PHPUnit tests, never in this frontend).

1. `src/lib/api.ts` exports `ensureCsrfCookie()` and `apiGet/apiPost/apiPatch/apiDelete`. Every
   mutating call first ensures the `XSRF-TOKEN` cookie exists (via `GET /sanctum/csrf-cookie`),
   then sends it back as the `X-XSRF-TOKEN` header. All requests use `credentials: "include"` so
   the session cookie travels with them.
2. `src/lib/auth.ts` wraps the three auth endpoints: `login()`, `logout()`, `getCurrentUser()`
   (`GET /api/user`, which also returns `roles`).
3. `src/context/AuthContext.tsx` calls `getCurrentUser()` once on mount, exposes
   `{ user, loading, login, logout }` via `useAuth()`.
4. `src/components/auth/AuthGate.tsx` wraps every route except `/signin`. It renders a spinner
   while `loading`, redirects to `/signin` if there's no `user`, and blocks with a "not
   authorized" state if the user exists but `isAdmin(user)` (from `src/types/auth.ts`) is false.

If you're debugging "why am I bounced to sign-in," check in this order: is the Laravel dev
server actually running, does `VITE_API_ORIGIN` in `.env` match it, and does the browser have the
`XSRF-TOKEN`/`clinova_session` cookies set (DevTools → Application → Cookies).

### Routing

In `src/App.tsx`:

1. `BrowserRouter` is the router root, wrapped in `AuthProvider`.
2. `/signin` is the only route outside `AuthGate`.
3. Every other route is nested under `AuthGate` -> `AppLayout` (sidebar/header shell) ->
   `<Outlet />`.
4. `*` goes to `NotFound`.

### Main shell

`src/layout/AppLayout.tsx`:

1. Wraps shell with `SidebarProvider`.
2. Renders `AppSidebar`, `AppHeader`, and route content through `<Outlet />`.
3. Sidebar width and content margin depend on sidebar context state.

### Shared app state

1. `src/context/AuthContext.tsx` — current user + auth actions (see above).
2. `src/context/ThemeContext.tsx` — stores theme in `localStorage`, toggles `dark` class on
   `<html>`.
3. `src/context/SidebarContext.tsx` — expanded/collapsed, mobile open, hover states. Used by
   sidebar, header, and backdrop.

### Styling system

`src/index.css` uses Tailwind v4 directives (`@theme`, `@utility`, `@layer base/utilities`).
Brand tokens (`--color-brand-*`) are Clinova teal — don't reintroduce the old template blue.

## 3) Where to resume product work

1. **Every page is wired.** `src/pages/*` has no `PlaceholderPage` usages left — see §4, §4c–§4i
   for the reference pattern each page demonstrates. The "resume work" questions from here are
   either deepening an existing page or starting a genuinely new domain, not wiring a placeholder.
2. `src/pages/Dashboard/Home.tsx` is wired: KPI tiles (`GET /admin/analytics/overview`) plus four
   charts — three computed client-side from `GET /admin/users`, one backed by a dedicated new
   aggregate endpoint, `GET /admin/analytics/study-activity` (see §4b). It's the reference for a
   page that's read-only end to end — no create/edit/delete to reason about, just fetch + render.
3. `src/layout/AppSidebar.tsx` — nav list is already final (8 Clinova sections); only touch it
   if a new top-level section is added.

## 4) Worked example: wiring a real page (Study Library)

Study Library is wired end to end (subjects, topics, materials are real `GET` calls; create/edit/
publish are still inert — see the file's top comment). Read it as the reference pattern for every
other page in §6's checklist. It has four pieces, each in its own place:

### Piece 1: types, built from the docs, not guessed

`src/types/studyLibrary.ts` mirrors `../api/docs/API_REFERENCE.md` §StudyLibrary — including the
non-obvious part: there's no single endpoint that returns the full `Subject -> Topic ->
StudyMaterial` tree. `Topic` doesn't even carry `subject_id` in its response (the caller already
knows it, since it's the query param that was just sent). Read that file's top comment before
copying this pattern to a domain with a different shape.

### Piece 2: one function per endpoint, in a per-domain `lib/` module

`src/lib/studyLibrary.ts` wraps each `GET` call in a named function (`getSubjects()`,
`getTopics(subjectId)`, `getTopicMaterials(topicId)`) instead of pages calling
`apiGet<...>("/study-library/...")` with the path spelled out inline. This is the standing
convention now (see §5), not a one-off — `src/lib/auth.ts` already did this for the Users domain
before Study Library existed. The reasons: one place to fix a path if it ever changes, one place a
new page can find the right call instead of re-deriving it from the docs, and page components stay
free of raw endpoint strings (which matters for anyone auditing what the frontend actually talks
to, e.g. before a deploy).

```ts
// src/lib/studyLibrary.ts
export function getSubjects() {
  return apiGet<ApiListResponse<Subject>>("/study-library/subjects");
}
```

### Piece 3: the page does orchestration + the loading/error pattern

In the page component:

```tsx
const [data, setData] = useState<StudyMaterial[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;
  setLoading(true);
  setError(null);
  getTopicMaterials(topicId)
    .then((res) => { if (!cancelled) setData(res.data); })
    .catch((err) => {
      if (!cancelled) {
        setError(err instanceof ApiError ? err.message : "Couldn't load materials.");
      }
    })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, [topicId]);
```

`cancelled` (not just a `mounted` boolean) matters here because this effect re-runs every time
`topicId` changes — without it, a slow response for a topic the admin already clicked away from
can land after a faster response for the topic they're now looking at, and silently overwrite it
with stale data.

### Piece 4: skeletons + explicit empty states, not a bare "Loading…"

See `TreeSkeleton`/`MaterialsSkeleton` in `StudyLibrary.tsx` and the three distinct empty states
in its materials panel ("select a topic" vs "no materials in this topic" vs "no materials match
your search" — three different situations, three different messages, not one generic "nothing
here").

## 4b) Worked example: charts from data that already exists (Dashboard)

`src/pages/Dashboard/Home.tsx` adds three more patterns worth knowing before you hit a page that
needs them.

### Compute chart data client-side instead of asking the backend to aggregate it

Three of the dashboard's four charts — "students by track" (donut), "signups over the last 30
days" (bar), and "streak distribution" (bar, added 2026-10-05) — are **not** backed by a
dedicated analytics endpoint. They're computed in the browser from the plain list
`getAllAdminUsers()` already returns (`src/lib/users.ts`). `TrackDistributionChart` counts `track`
values; `SignupsTrendChart` buckets `created_at` by day; `StreakDistributionChart` buckets
`streak_count` into five engagement-stage ranges. Before asking for a new backend aggregation
endpoint, check whether the data you need is already sitting in an existing list response —
client-side aggregation over data you already fetched is simpler than a new endpoint, as long as
the list isn't huge (a few dozen students is nothing; tens of thousands would be a different
call — see `getAllAdminUsers()`'s own comment on where that line is and what crossing it would
mean).

### ...unless the data genuinely isn't in any list the frontend already fetches

The fourth chart, **"study activity over time"** (`StudyActivityChart.tsx`, added 2026-10-05), is
the counter-example: it needs daily totals from the `StudySessions` table (`actual_minutes`,
`completed`, `started_at`), and nothing else in this app ever fetches session rows in bulk — there
was no existing list to aggregate client-side. That's the actual test for "new endpoint vs.
client-side aggregation": not "is this a chart" but "does an existing fetch already carry the raw
data, or would I have to add a new bulk fetch just to compute this in the browser." Here the
answer was genuinely new plumbing either way, so it became a backend aggregate endpoint instead —
`GET /admin/analytics/study-activity?days=` → `GetStudyActivityOverTimeAction`
(`api/app/Domain/Admin/Actions/`), same shape as `GetOverviewMetricsAction`: groups by
`DATE(started_at)` in SQL rather than pulling every session row into PHP, and zero-fills every day
in the window *server-side* before returning — the frontend never has to guess whether a missing
day means zero or means the request is still loading.

### Lazy-load a heavy dependency

ApexCharts (`react-apexcharts`) is ~250KB gzipped, and as of this writing nothing else in the app
uses it. All four chart components are loaded with `React.lazy` + `Suspense` in `Home.tsx`:

```tsx
const TrackDistributionChart = lazy(() => import("./TrackDistributionChart"));
const SignupsTrendChart = lazy(() => import("./SignupsTrendChart"));
const StreakDistributionChart = lazy(() => import("./StreakDistributionChart"));
const StudyActivityChart = lazy(() => import("./StudyActivityChart"));
// ...
<Suspense fallback={<ChartSkeleton />}>
  <TrackDistributionChart ... />
</Suspense>
```

Without this, `react-apexcharts` ends up in the one shared bundle every page downloads, including
pages that never render a chart. There's no route-level code-splitting anywhere else in this app
(every page in `App.tsx` is a static import) — this lazy-loading is scoped to just these four
components, not a precedent to apply everywhere by default. Reach for it when a page pulls in a
dependency that's both large and not needed by most other pages — a charting library, a rich text
editor, a PDF renderer, that kind of thing — not for routine page components.

## 4c) Worked example: reusing another domain's data without duplicating its UI (Flashcards)

`src/pages/Flashcards/Flashcards.tsx` adds two more patterns.

### Reuse a `lib/` module across domains when the data is shared, but don't reuse the management UI

`FlashcardDeck` hangs off `Topic`, same as `StudyMaterial` — so Flashcards needs the same
Subject/Topic tree Study Library has. It imports `getSubjects()`/`getTopics()` straight from
`src/lib/studyLibrary.ts` rather than duplicating those calls in a new `lib/flashcards.ts`
function, since they're the exact same endpoints either page would call. But the *UI* for that
tree is deliberately **not** shared: Flashcards renders it read-only (no add/edit/delete), because
Subject/Topic management already lives on the Study Library page. Subject/Topic are shared
curriculum structure, not owned by either domain — giving Flashcards its own copy of that CRUD
would just be a second place to maintain the same data, and an admin would have no reason to
expect "edit a subject" to work differently depending on which page they happened to be on.

The rule: share the `lib/` function (it's just a fetch), don't reflexively share the component
that renders it, if the two pages actually want different things done with that data.

### A modal opened from inside another modal

Click a deck's card count and `DeckCardsModal` opens, listing its cards; click "Add card" or a
card's edit icon inside *that* modal and `CardFormModal` opens on top of it
(`src/pages/Flashcards/DeckCardsModal.tsx`). Both are just `<Modal>` instances from
`src/components/ui/modal` — nothing special was needed to stack them, React renders whichever is
currently open, and the inner one's backdrop naturally covers the outer one. Reach for this when
a list inside a modal needs its own create/edit flow, rather than closing the first modal to open
a second top-level one and losing context.

## 4d) Worked example: the simplest domain, and knowing when *not* to add something (Sound Library)

`src/pages/SoundLibrary/SoundLibrary.tsx` is the easy one — flat list, no Subject/Topic hierarchy,
no draft/published workflow, just active/inactive. Worth reading first if a future domain is this
simple and the Study Library pattern feels like overkill for it. Client-side filtering (category
pills, active/inactive, search) over the one already-fetched list — no reason to ask the backend
to filter a dataset this small.

The one thing worth internalizing from this page isn't a technique, it's a judgment call: the
backend had `activate`/`deactivate` but no generic update, and no delete at all. Update got added
(editing a sound's name/category/file_url is a reasonable gap). Delete deliberately did not,
because the existing code already explained why — `SoundController`'s `deactivate()` docblock
says pulling a sound from the picker goes through deactivation specifically so
`study_sessions.sound_id` (set to `nullOnDelete`) doesn't lose its link to which sound a past
session used. That reasoning was checked against the actual migration before trusting it, not
just taken on faith from the comment — but once confirmed, it was a real reason not to add
something, not an oversight to "fix." Subject/Topic/Deck's missing CRUD earlier in this project
*was* an oversight (confirmed by a user asking "can't edit or delete, is that fair?"); this one
isn't — the lesson is to tell the difference before reflexively completing every CRUD set to
match the others.

### File uploads — the first one in this app, and the pattern for the next one

Sound Library started metadata-only (paste a URL to already-hosted audio) and grew a real file
upload after the fact. If another domain ever needs this (a user avatar, say), this is the
pattern, not something to rederive:

1. **Backend**: accept `audio_file` alongside the existing `file_url` field
   (`required_without` each other on create), store it on the `public` disk in the controller, and
   derive the URL from where it landed (`Storage::disk('public')->url($path)`). The rest of the
   app — the Resource, the frontend type, every other consumer — only ever sees `file_url`; it has
   no idea whether that URL came from a paste or an upload, which is the point.
2. **`src/lib/api.ts`**: `apiFetch` detects a `FormData` body and skips JSON-encoding it (the
   browser needs to set its own `multipart/form-data; boundary=...` `Content-Type`, which means
   *not* setting `Content-Type` by hand at all). For `PATCH` with a `FormData` body specifically,
   it also spoofs the method — sends `POST` with an appended `_method=PATCH` field. This is a PHP
   limitation, not a Laravel or React one: PHP's native multipart parser only ever populates
   `$_FILES` for a real `POST`; a real `PATCH` carrying a file silently loses it before any
   framework code runs. Every future PATCH-with-a-file call gets this for free through the shared
   client — no per-page workaround needed.
3. **`src/lib/<domain>.ts`**: add `create<Thing>WithFile(formData)` / `update<Thing>WithFile(id,
   formData)` as siblings of the existing JSON `create<Thing>()`/`update<Thing>()` — same
   endpoints, just a different body shape. Don't try to make one function handle both; building
   the `FormData` vs. the plain object happens in different enough ways in the component that a
   union-typed single function just pushes the branching to a worse spot.
4. **The modal**: a "Paste URL" / "Upload file" toggle, with client-side size/extension checks
   mirroring the backend's validation rules — not a replacement for server-side validation, just
   faster feedback than a round trip.
5. **Local dev**: PHP's default `upload_max_filesize` (2M) is too small to test this with a real
   file. `api/public/.user.ini` raises it, but **doesn't help `php artisan serve`** — the built-in
   dev server doesn't honor `.user.ini` at all (that's an Apache/PHP-FPM thing). Start the API with
   `PHP_INI_SCAN_DIR="$(pwd)/.phpini" php artisan serve --no-reload` instead while testing uploads
   — `--no-reload` is required for `artisan serve` to pass that env var through to its child
   process at all. Full story, plus a separate Nginx gotcha for deployment, in
   `api/docs/ARCHITECTURE.md`.

## 4e) Worked example: building the page when the plumbing already exists (Users)

`src/pages/Users/Users.tsx` is the fastest of the wired pages to point to, because most of the
work was already done elsewhere: `src/lib/users.ts` and `src/types/users.ts` existed before this
page did, built for the Dashboard's charts (§4b). All that needed adding was
`suspendUser()`/`reactivateUser()` — two functions — then the page itself. Worth remembering: a
`lib/<domain>.ts` module isn't just for the page it was originally built for; check whether one
already exists before assuming a new domain needs one from scratch.

Two smaller things worth carrying forward:

- **Table over cards when rows share several comparable fields.** Sound Library's grid of cards
  works because each sound is mostly judged on its own; a list of students with track, level,
  streak, status, and joined date side by side reads better as table rows you can scan down a
  column. Neither is "more correct" — pick based on whether the data's shape is "one card you
  read in isolation" or "several fields you compare across rows."
- **Don't assume the old template's feature set.** The pre-Clinova version of this page had a
  full create-user-with-role-assignment form. None of that backend exists — students self-register,
  `UserManagementController::index()` only ever returns students, and the only write actions are
  suspend/reactivate. When picking up a template-derived page, check what the *real* backend
  supports before porting the old UI forward; the template's shape is a hint at layout, not a
  spec for what the page should do.

### Pagination (added 2026-10-05) — and the tension it creates with client-side filtering

`GET /admin/users` is now paginated (`?page=`, 25/page, capped at `?per_page=100`) — the first
list besides Activity Log to need this, since the student count genuinely grows with real signups
while curated content (Subjects, Sounds) stays admin-sized. `getAdminUsers(page)` feeds the table
directly; Previous/Next controls read `meta.current_page`/`meta.last_page`/`meta.total` straight
off the paginated response (`ApiPaginatedResponse<T>` in `src/types/common.ts` — Laravel's
`Resource::collection()` wraps a paginator's output in `{data, links, meta}` automatically, no
Resource class changes needed on the backend).

This creates a real tension worth knowing before you hit it elsewhere: the page's roll-up tiles
(Total/Active/Suspended) and its track/status/search filters both previously ran over *every*
student, because the old unpaginated endpoint returned everyone in one response. Pagination breaks
that for free. The fix applied here treats the two differently rather than picking one blanket
rule:

- **Tiles** need accurate totals, so they use `getAllAdminUsers()` (same file) — a second helper
  that walks every page and concatenates, capped at 20 page-fetches as a guard. This is safe
  specifically because the tiles only do arithmetic over the result; it's rendering thousands of
  rows into the DOM that pagination was actually protecting against, and arithmetic over JSON
  doesn't have that cost.
- **Filters/search** were left running against only the current page's rows, with a small "filtering
  this page only" note shown when it matters, rather than also reaching for `getAllAdminUsers()`
  there — filtering a client-side list that's secretly the *entire* student population just to
  work around pagination would quietly defeat the point of paginating the table in the first
  place. If this ever becomes a real admin complaint, the honest fix is a backend search param,
  not a bigger client-side fetch.

`src/pages/ActivityLog/ActivityLog.tsx` got the same pagination treatment the same day, minus the
tiles complication (that page has none) — see §4f.

## 4f) Worked example: a free-text field that isn't an enum (Activity Log)

`src/pages/ActivityLog/ActivityLog.tsx` needed zero backend changes — `GET /admin/activity-log`
already existed, fully tested. Purely a frontend build, and the fastest of all the wired pages for
exactly that reason: when a domain's backend is already complete, check for that before assuming
there's API work ahead of the page work.

The one real decision: `action` is a free-text string on the backend (`AdminActivityLog.action`),
not a validated enum — new Action classes add new values over time, and nothing enumerates them
anywhere. `ACTION_CONFIG` maps the five values that exist *today* (found by grepping
`action: '...'` across `app/Domain`, not guessed) to a nicer label/icon/color, and
`humanizeAction()` (snake_case → Title Case) plus a generic icon handle anything not in that map.
Don't build a `type Action = 'published_study_material' | 'suspended_user' | ...` union for a
field like this — it'll be wrong the next time someone adds an Action class, and TypeScript won't
warn anyone, because the backend never validates against that union either.

**The gap this page originally surfaced is half-closed now.** None of the Subject/Topic/Flashcard-
Deck/Flashcard/Sound CRUD added in earlier passes wrote to this log at first — those were built as
plain `$model->update()`/`->delete()` directly in controllers (correctly, per `ARCHITECTURE.md`'s
"simple CRUD belongs in a controller" rule), and only dedicated Action classes fired
`AdminActionPerformed`. As of 2026-10-05, **deletes** fire it too — `SubjectController`,
`TopicController`, `FlashcardDeckController`, and `FlashcardController`'s `destroy()` methods each
call `event(new AdminActionPerformed(...))` directly, no new Action class needed since `destroy()`
already is the one place that state change happens. Routine **edits** still don't log, on purpose:
a delete is consequential and hard to reverse, the same bar the five original actions (publish,
suspend, broadcast) were held to; a routine update isn't, and logging it would add noise without
adding signal. If that judgment call turns out wrong in practice, the fix is the same one-line
`event(new AdminActionPerformed(...))` addition to each `update()` method, not a new pattern.

**Pagination, added the same day:** `GET /admin/activity-log` is now paginated (`?page=`, 20/page,
capped at `?per_page=100`) — this was the first list in the app to get it, since it's the one
genuinely unbounded list (every logged action adds a row, forever, nothing ever gets curated out
of it). Same `ApiPaginatedResponse<T>`/Previous-Next pattern as Users (§4e), and the same accepted
tradeoff: the action-type filter pills and description/admin search only see the current page.
Simpler than Users' version of this, though — no roll-up tiles on this page depend on the full
list, so there's no `getAllAdminLog()`-style second fetch to reason about.

## 4g) Worked example: a page with no list endpoint to fetch (Announcements)

`src/pages/Announcements/Announcements.tsx` breaks the pattern every other wired page has
followed so far, on purpose: the domain only has `POST /admin/announcements`, fire-and-forget (it
writes a database notification directly to each matching student, nothing persisted anywhere an
admin can query back). There's no `GET` to build a `types → lib → fetch-and-render page` pipeline
around, so don't force one — the page is a compose form, full stop.

Two things worth carrying forward:

1. **Check what the response actually contains before reaching for `ApiResponse<T>`.** The
   generic type (`src/types/common.ts`) is `{ data: T }` only. This endpoint also returns a
   `message` ("Announcement sent.") that's worth surfacing to the admin — rather than force-fit
   the generic type and lose it, `BroadcastAnnouncementResponse` in
   `src/types/announcements.ts` is its own small response shape. Don't assume every endpoint's
   response matches the generic wrapper; read what `ApiResponse::success()` is actually called
   with in the controller.
2. **Real-but-ephemeral data needs a label that says so.** The page keeps a "sent this session"
   list — genuine data (the actual `recipient_count` the backend returned for each send), not
   fabricated, but local React state that clears on refresh. The heading says "this session," not
   "history" or "recent," specifically so nobody mistakes it for a persisted audit trail it isn't.
   If a real history is ever needed, that's new backend work (a table + a `GET` endpoint) — the
   frontend has no honest way to fake persistence it doesn't have.

## 4h) Worked example: scoping a vague page by checking the backend, not guessing (Settings)

`src/pages/Settings/Settings.tsx` was the last `PlaceholderPage` in the app, and the vaguest one
to start from — "Settings" could have meant almost anything. Before writing a speculative
platform-config schema, the actual backend got checked: no feature flags, no global config table,
and the only thing named "settings" (`user_settings`) is a future per-student focus-timer
preference, not an admin concern at all. So the page does the one real thing every admin console
needs and that's actually buildable: change your own password.

That needed a genuine new backend endpoint — no authenticated "change my own password" route
existed, only the guest forgot-password-via-email flow. Worth knowing if another vague
"Settings"-shaped page comes up later:

- Check what already exists before assuming a page needs new plumbing *or* assuming it needs
  none — Users (§4e) needed zero backend changes, Settings needed one small real endpoint. Both
  were only knowable by actually looking, not by pattern-matching to the last page built.
- Reuse validation patterns across similar fields instead of inventing new rules. The new
  password here uses the exact same `['required', 'confirmed', Rules\Password::defaults()]`
  `RegisteredUserController` already uses — found by reading that controller first, not guessed.
- `current_password` is a built-in Laravel validation rule — verifies against the authenticated
  user's real password automatically. No reason to hand-roll `Hash::check()` in the controller
  when the framework already has this exact rule.
- A new HTTP verb showing up (`PUT`, here) means the shared client needs it too —
  `src/lib/api.ts` only had `apiGet`/`apiPost`/`apiPatch`/`apiDelete` before this; `apiPut` was a
  one-line addition, not a reason to bypass the shared client for this one call.

## 4i) Worked example: making the shell role-aware instead of forking it (Lecturers)

Every page up to this point assumed one thing that stopped being true on 2026-10-06: that anyone
who makes it past `AuthGate` is an admin. A second role, `lecturer`, needed its own narrower slice
of this console — Study Library and Flashcards, nothing else. The request that kicked this off was
phrased as "duplicate the admin UI for lecturers" — worth reading as *intent* (a second, cut-down
console experience), not as a literal spec, because literally forking the SPA would mean two copies
of `StudyLibrary.tsx` to keep in sync forever. The actual build makes the *existing* app role-aware
instead — one codebase, filtered nav/routes — which gets the same outcome without the drift risk.

### Two gates, not one, once a second role exists

`AuthGate.tsx` used to answer one question ("is this account an admin") that quietly conflated two
different things: "is this account allowed in the console at all" and "is this account allowed on
*this* route." Adding lecturer split those apart:

- `AuthGate` still answers the first question — now `isAdmin(user) || isLecturer(user)`, not
  admin-only.
- `RequireRole.tsx` (new) answers the second, nested inside `AuthGate` around just the six
  admin-only routes in `App.tsx`. It redirects rather than showing an error block
  (`<Navigate to="/study-library" replace />`) — the backend already 403s a lecturer hitting an
  admin-only endpoint, so this component's only job is making sure a lecturer who types `/users`
  into the URL bar lands somewhere real instead of watching a fetch fail.

```tsx
<Route element={<RequireRole roles={["admin"]} />}>
  <Route path="/users" element={<Users />} />
  {/* ...the other five admin-only routes... */}
</Route>
```

The next role that gets added should reuse this `RequireRole` component, not reinvent a third
flavor of "is this allowed" check.

### Filter the nav once, reuse the filtered list everywhere that slices it

`AppSidebar.tsx`'s `navItems` gained an optional `roles?: ("admin" | "lecturer")[]` per item
(omitted = visible to both). The subtle part wasn't the sidebar itself — it was that
`AppLayout.tsx`'s `MobileBottomNav` was already slicing `navItems.slice(0, 5)` directly for the
mobile bottom bar. Filtering only inside `AppSidebar` and leaving that slice alone would have
leaked admin-only items into a lecturer's first-5 mobile nav. Fix: export a `getVisibleNavItems(user)`
helper from `AppSidebar.tsx` and have *both* consumers call it before either renders or slices —
filter once, reuse the result, don't filter-then-slice in one place and slice-the-raw-array in
another.

### When a page needs zero changes, that's the sign the backend split the work correctly

`StudyLibrary.tsx` and `Flashcards.tsx` needed no role-conditional UI at all — not because nobody
checked, but because the backend gives lecturers full parity with admin on those two domains (see
`api/docs/ARCHITECTURE.md`'s role-model section). If a future role needs a page to behave
*differently* per role (not just "allowed or not"), that's a sign the backend should be doing
narrower scoping too, not a cue to start branching heavily inside a shared page component.

### A sibling page, not a from-scratch one

`Lecturers.tsx` (admin-only — lecturers don't manage other lecturers) was built by copying
`Users.tsx`'s shape — same pagination pattern, same loading/error/empty states — rather than
starting from a blank page or `PlaceholderPage`. The one genuine difference, a create flow
(`LecturerFormModal.tsx`), exists because unlike students, lecturers have no self-registration
path; someone has to create the account. Recognizing "this is 90% an existing page" before writing
anything saved rebuilding the pagination/stat-tile/empty-state logic a third time.

## 5) Suggested convention as features grow

1. `src/types/*` — one file per domain for DTO/response types, built from
   `API_REFERENCE.md`, not guessed.
2. `src/lib/*` — one small module per domain (`auth.ts`, `studyLibrary.ts`, ...), each exporting
   named functions that wrap `apiGet`/`apiPost`/etc. for that domain's endpoints. `src/lib/api.ts`
   stays the one generic fetch client underneath all of them — pages call the named functions, not
   `apiGet` directly, once a domain module exists for that page.
3. `src/hooks/*` — reusable data hooks, extracted after the second real usage, not the first.
4. `src/pages/*` — route-level orchestration: call the `lib/*` functions, hold loading/error/data
   state, render skeletons and explicit empty states.
5. `src/components/*` — keep presentational; no fetch logic inside reusable UI components.

## 6) Common mistakes to avoid

1. Putting fetch logic deep inside reusable UI components instead of pages/hooks.
2. Mixing backend response shape directly into UI without typing it against
   `API_REFERENCE.md` first.
3. Re-implementing CSRF/credentials handling per page instead of reusing `src/lib/api.ts`.
4. Assuming bearer-token auth — this app is cookie-session only; don't resurrect
   `Authorization` headers or localStorage tokens.
5. Editing `index.css` brand tokens without checking impact across all pages.
6. Creating a route but forgetting the matching sidebar link (or vice versa).
7. Using `<a href>` for internal navigation instead of `Link`.
8. Trusting that an icon renders just because the button around it works. Several of this
   template's source SVGs in `src/icons/*.svg` have a `<path>` with no `fill` (or an invalid
   `fill=""`) inside an `<svg fill="none">` wrapper — the path silently inherits `fill="none"`
   and renders invisible, while the button/click handler around it works fine. `eye.svg`,
   `eye-close.svg`, `plus.svg`, `arrow-up/down/right.svg` all had this bug and were fixed by
   adding `fill="currentColor"` to the path, matching `pencil.svg`'s pattern. If a newly-used
   icon looks blank, check the raw `.svg` file for this exact issue before assuming it's a CSS or
   layout problem. (Stroke-based icons like the chevrons are fine as-is — they use
   `stroke="currentColor"` with no fill by design, don't "fix" those.)

## 7) Production readiness checklist for the next phase

1. ~~Replace all `PlaceholderPage` usages with real API-backed state (one domain at a time).~~
   Done — every page in `src/pages/*` is wired, no `PlaceholderPage` usages remain.
2. ~~Wire `Dashboard/Home.tsx` KPIs.~~ Done — KPIs and four charts are all wired (2026-10-05).
3. Replace `NotificationDropdown.tsx` demo data with a real endpoint once one exists.
4. Add centralized API error handling for expired sessions (419/401 responses should bounce to
   `/signin`, not render a raw error).
5. Add form validation for create/update flows, matching backend validation rules documented in
   `API_REFERENCE.md`. (`StudyLibrary`'s modals already do this — field-level errors from the
   backend's 422 responses — use that as the template.)
6. Add basic tests for critical pages/services once the data layer stabilizes.

## 8) What to read first each day

If you have 20 minutes, read in this order:

1. `src/main.tsx`
2. `src/App.tsx`
3. `src/context/AuthContext.tsx` + `src/components/auth/AuthGate.tsx`
4. `src/lib/api.ts`, then `src/lib/studyLibrary.ts` as the reference for what a per-domain module
   looks like (`analytics.ts`/`users.ts` are smaller, simpler examples of the same pattern)
5. `src/layout/AppSidebar.tsx`
6. Whichever page you're resuming work on — if it's still a `PlaceholderPage`, its `endpoint`
   string; if it's wired, its matching `src/lib/<domain>.ts` and `src/types/<domain>.ts`
   cross-referenced against `../api/docs/API_REFERENCE.md`.

That sequence gives full context of auth flow, app shell, and exactly where real data wiring
needs to happen next.
