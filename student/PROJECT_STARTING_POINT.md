# Clinova Student App — Starting Point

Last updated: 2026-10-28 (PWA support — installable, works offline for repeat visits, §4i)

## 1) What this project is

The **student-facing** Clinova app — mobile-first, built against the same Laravel API as
`../admin` (`../api`), over the same Sanctum cookie-session auth. It is a **separate Vite project**
from the admin console, not a fork of it: completely different shell (a single-column mobile flow,
not a sidebar dashboard), but reusing the admin console's proven mechanics wholesale — same
`apiFetch`/CSRF-cookie pattern, same `AuthContext`/`AuthGate` shape, same Tailwind v4 brand token
scale (`brand-500 #0e7c6b`), same logo asset. See `../admin/REACT_REENTRY_API_GUIDE.md` for the
fuller version of every pattern mirrored here — nothing here was invented from scratch.

Built from a mobile-UI mockup the user supplied (7 screens + an onboarding screen, "NurseLearn"
branding), adapted to Clinova's actual brand. The user intends to rebuild this in Flutter later —
this web build is the reference implementation and real working backend integration, with visual
fidelity on a *phone-width viewport* prioritized over desktop responsiveness. `index.html`'s
viewport meta pins `maximum-scale=1.0` deliberately, for a native-app feel on mobile.

Stack: React 18.3 + TypeScript 5.8 + Vite 6 + Tailwind v4 (CSS-first `@theme`, no
`tailwind.config.js`) + `react-router` v7. Dev server runs on **port 5174** (admin owns 5173) —
both share one backend, which required widening `api/config/cors.php` and
`SANCTUM_STATEFUL_DOMAINS` to accept two origins instead of one (see `api/.env`'s `FRONTEND_URLS`).

## 2) Current scope — core Study With Me flow only

Four screens, matching the mockup's screens 1–4. Screens 5–7 (Session Settings, Study Progress,
Sound Options as their own screen) and the onboarding screen are **not built yet** — deliberately
scoped out of this first pass, not forgotten:

- **Home** (`src/pages/Home/Home.tsx`, `/`) — greeting (real `user.name`), the Study With Me hero
  CTA (the one real, wired tile), a 2×2 tile grid matching the mockup (Study Library/AI
  Practice/Flashcards render visually but are disabled with a "Coming soon" mark — their backends
  either don't exist yet (AI Practice) or their student-facing browsing UI is out of this pass's
  scope (Study Library, Flashcards)), and a "Today's Progress" card. That card's "X/Y" format is
  real on the X side (today's completed-session count, computed client-side from
  `GET /study-sessions` — no backend aggregate endpoint exists for this yet) but Y
  (`DAILY_SESSION_GOAL` in `Home.tsx`) is a disclosed local constant, not a real backend goal —
  there's no daily-goal concept on the backend at all. Don't mistake that constant for real data if
  you're debugging a "wrong total" report later.
- **Choose Your Session** (`src/pages/StudyWithMe/SessionSetup.tsx`, `/study-with-me`) — duration
  presets (25/50/90 min) + a **Custom** input, both bounded to the backend's real
  `StartFocusSessionRequest` validation (5–180 minutes). The mockup's 4th preset ("14 Hours") was
  swapped for Custom rather than built as a card that would always fail validation — see the
  comment at the top of the duration-presets array. Sound picker is real `GET /sounds` data (the
  student-facing shape only — `source`/`license`/`is_active` are stripped server-side for any
  non-admin caller, confirmed by `SoundTest.php`). "Start Session" calls
  `POST /study-sessions` and stores the result in `StudySessionContext`.
- **Active Focus Timer** (`src/pages/StudyWithMe/ActiveSession.tsx`, `/study-with-me/active`) — a
  real countdown computed from `Date.now() - startedAt` each tick (not a decrementing counter), so
  backgrounding the tab doesn't desync it. Pause/resume is real (stops the interval, corrects for
  accumulated paused time via `pauseAccumRef`) — purely client-side, no backend call until the
  session actually ends. One shared `<audio>` element loops the selected sound, same
  single-shared-element pattern `admin/src/pages/SoundLibrary/SoundLibrary.tsx` already uses.
  Reaching 0 naturally calls `PATCH /study-sessions/{id}/finish` with `completed: true` (this is
  what triggers the backend's server-side streak update — see `UpdateStreakOnSessionCompleted`) and
  navigates to Break; "End session early" calls the same endpoint with `completed: false` and goes
  straight back to Home (no break screen for an incomplete session).
- **Break Screen** (`src/pages/StudyWithMe/BreakScreen.tsx`, `/study-with-me/break`) — **purely
  client-side timing, no backend row at all.** Confirmed during research: `SessionType::Break`
  exists as a PHP enum case but nothing in the backend ever creates a break-type `StudySession` —
  there is no endpoint to call for a break. Fixed 10-minute duration (`BREAK_SECONDS` in the file),
  not yet configurable (that's Session Settings, out of scope).

`CircularTimer.tsx` (`src/components/`) is the one shared visual piece between Active and Break —
a ~70-line hand-rolled SVG progress ring, not a charting library (this app has no ApexCharts
dependency at all, unlike admin). `StudySessionContext.tsx` carries the in-progress session
(`sessionId`, `plannedMinutes`, `soundId`/`soundName`/`soundUrl`, `startedAt`) across the three-step
flow — deliberately not persisted to `localStorage`; refreshing mid-timer loses the in-progress
session (the backend row for it just sits as `completed: false`, an honest abandoned-session
record, not a bug). Revisit if "resume after refresh" turns out to matter.

## 3) Icons — a small hand-rolled set, not admin's icon pipeline

`src/components/icons.tsx` has a dozen simple line-icon components (Home, Headphones, Book, Cards,
Play/Pause, Clock, Droplet, Stretch, Apple, Breathe, Heart, etc.) written directly as inline SVG,
not pulled from admin's `vite-plugin-svgr` + pre-made SVG library — this app only needed a handful
of glyphs, not admin's much larger set. Every path sets `stroke="currentColor"` (or `fill`, for the
couple of filled icons) explicitly, never relying on an inherited default — admin's
`REACT_REENTRY_API_GUIDE.md` §6 documents a real bug class where a newly-added SVG with no explicit
fill/stroke silently renders invisible; these were written from the start to avoid that, not
patched after hitting it.

## 4) Auth model — same mechanism as admin, inverted role check

Sanctum SPA cookie-session auth, identical to admin (`src/lib/api.ts` is copied near-verbatim —
see that file's own comment). The one real difference: `src/components/auth/AuthGate.tsx` checks
`isStudent(user)` (`src/types/auth.ts`) instead of admin/lecturer — an admin or lecturer account
signing in here gets the same "not allowed" treatment a student gets on the admin console.
`AuthUser` itself is the identical type to admin's (confirmed `GET /user` returns the same raw
`User` model regardless of caller's role — nothing student-specific to add).

**Registration is wired up** (`src/pages/SignUp/SignUp.tsx`, `/signup`, linked from `/signin`).
This required a real backend fix first: `RegisteredUserController::store()` was not calling
`assignRole('student')` on the new user at all — confirmed by reading it during this pass's
research, and fixed the same day (`api/app/Domain/Users/Http/Controllers/Auth/`, covered by a new
`RegistrationTest::test_new_users_are_assigned_the_student_role()`). Safe to fix unconditionally
because `/register` is reached only from this app — the admin console and lecturer accounts are
always admin-created, never self-registered, confirmed by grepping `admin/src` for any `/register`
call before making the change. `lib/auth.ts`'s `register()` deliberately does **not** collapse a
422 into a single message the way `login()` does — sign-up has several independently-failable
fields (name, email uniqueness, password confirmation), so `SignUp.tsx` renders per-field errors
the same way every create-form modal in the admin console already does.

## 4a) Responsive desktop layout — mirrors admin's shell exactly, not approximately

Originally shipped mobile-only (every screen capped at `max-w-md`, desktop just showed the same
narrow column centered on a wide background). The user pushed back: it's a real web app, a student
might open it on a laptop, and desktop should behave like a real responsive app — specifically,
like admin's own layout, not a loosely-inspired approximation.

**A real bug surfaced while building this, not just a design gap.** `index.css`'s `@theme` block
reset every Tailwind breakpoint (`--breakpoint-*: initial`) and only redefined `2xsm/xsm/sm/md` —
`lg`/`xl`/`2xl` were never redefined, so every `lg:` class anywhere in this app was silently inert
(confirmed: zero `1024px` media queries in the compiled CSS before the fix). This is *why* desktop
looked identical to mobile even after a full responsive pass had already been written — not a
design choice, a dead breakpoint. Fixed by copying admin's exact full breakpoint set
(`2xsm/xsm/3xl/sm/md/lg/xl/2xl`) into the `@theme` block. Worth remembering if a future `lg:`/`xl:`
class here ever seems to do nothing: check this block first before assuming the class itself is
wrong.

**The shell is a real port of admin's, not a reskin:**
- `src/context/SidebarContext.tsx` — copied from admin almost verbatim (`isExpanded`/`isHovered`/
  `isMobileOpen`, same collapse/hover-to-peek mechanic). `isMobileOpen` is wired but nothing in this
  app currently triggers it — mobile stays `BottomNav`, not an off-canvas sidebar, so the sidebar
  simply never appears below `lg` regardless (`-translate-x-full`, no toggle button to open it).
- `src/components/Sidebar.tsx` — same 290px/90px width behavior, same `menu-item-*` utility classes
  (copied into `index.css` so the two apps' nav items render identically, not just similarly), same
  fixed/border/z-index treatment as `admin/src/layout/AppSidebar.tsx`.
- `src/components/Header.tsx` — desktop-only (`hidden lg:flex`), same sticky/border-b/padding shell
  as `admin/src/layout/AppHeader.tsx`, with the same collapse-toggle button. The right-side slot is
  intentionally smaller than admin's (no theme toggle — this app has no dark mode) but now carries
  real equivalents of admin's notification/profile widgets (see below), not nothing.
- `src/components/AppShell.tsx` — same `lg:ml-[290px]`/`lg:ml-[90px]` content-margin-tracks-sidebar-
  width mechanic and the same `mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6` content wrapper as
  `admin/src/layout/AppLayout.tsx`. Mobile (`<lg`) renders none of this — no margin, no `Header`, no
  outer padding — so it's additive only, confirmed by diffing against the pre-this-pass mobile
  screens.
- Each screen still owns its *internal* layout at `lg:+` (`AppShell` only owns the outer frame) —
  Home/SessionSetup get real two-column dashboard splits (main content + a side rail), ActiveSession/
  BreakScreen stay a single centered column (no natural second column for a focus timer; forcing one
  would mean inventing filler, not a real improvement).
- **One asymmetry, chosen deliberately, not a mistake:** ActiveSession/BreakScreen stay nav-free on
  *mobile* (full-screen focus mode, nothing to tap away with mid-session) but *do* get the sidebar
  on desktop — the user explicitly chose layout consistency over mobile-style immersion once a
  sidebar exists to be consistent with.

## 4b) Profile + notifications — real data, not placeholders

- **`src/pages/Profile/Profile.tsx`** (`/profile`) — same "no new endpoint, just render what
  `AuthContext` already fetched" reasoning as admin's Profile page. Reachable from the bottom nav's
  Profile tab (real now, was a disabled placeholder before this pass — `src/components/navItems.ts`)
  and from `ProfileMenu`.
- **`src/components/ProfileMenu.tsx`** — an avatar (initial letter) + dropdown (email, Profile link,
  Log out), same shape as `admin/src/components/header/UserDropdown.tsx` (toggle + close-on-route-
  change + real click-outside dismiss) but self-contained — this app has no generic Dropdown UI
  component to reuse. Used in both `Header.tsx` (desktop) and `MobileTopBar.tsx` (mobile, via an
  `avatarOnly` prop that drops the name text to stay compact).
- **Notifications are real, not a static preview.** Admin's own `NotificationDropdown.tsx` is
  explicitly static/placeholder data with a pulsing-dot-on-any-items treatment (see that file's own
  top comment) — deliberately *not* copied. This app's bell is wired to a genuine new backend
  endpoint instead:
  - **New**: `GET /notifications` and `POST /notifications/mark-all-read`
    (`api/app/Domain/Users/Http/Controllers/NotificationController.php`) — reads/updates the
    authenticated user's own rows in Laravel's built-in notifications table (no new table; the only
    writer today is `BroadcastAnnouncementAction`, i.e. admin's Announcements feature). Covered by
    `tests/Feature/Users/NotificationTest.php`.
  - **`src/components/NotificationBell.tsx`** — a real unread-count badge (number, capped display at
    "9+"), not a glow/ping animation. Opening the panel marks everything read in one call, same
    "opening it clears the badge" convention every real notification UI uses.
  - **`src/components/MobileTopBar.tsx`** (new) — the `<lg` counterpart to `Header.tsx`'s right-side
    icons (logo left, bell + avatar right). Each screen opts in explicitly (Home, SessionSetup,
    Profile) rather than this being baked into `AppShell` unconditionally — ActiveSession/
    BreakScreen also use `AppShell` but deliberately stay chrome-free on mobile, and this bar would
    visually clash with their full-bleed backgrounds. Logo is icon-only here (no "Clinova" text) to
    stay compact now that real functional icons share the row — the fuller wordmark+tagline brand
    moment belongs on the not-yet-built onboarding screen instead, a first-impression context where
    it's actually the right emphasis.
- `src/components/icons.tsx` gained `BellIcon` (admin's exact bell SVG path, reused not redrawn —
  "use the admin's icon" was explicit), `UserIcon` (a real person silhouette — the bottom nav's
  Profile tab briefly used `BookIcon` by mistake, a copy-paste leftover, fixed), `PanelToggleIcon`,
  `HorizontaLDots`.
- **Fixed in the same pass**: `BottomNav` was missing entirely from `SessionSetup.tsx` — navigating
  Home → Study With Me made the bottom nav disappear, which isn't a real mobile convention for a
  normal browsing/setup screen (unlike ActiveSession/BreakScreen's *deliberate* chrome-free focus
  mode). Added back.

## 4c) Session Settings — the first genuinely new backend domain piece this app required

Unlike everything before it (StudySessions, SoundLibrary, notifications, even the role-assignment
fix), this wasn't "the backend already supports it" or "a one-line fix" — the `user_settings` table
has existed since the very first migration pass with **zero** plumbing behind it: no model, no
controller, no routes. `api/docs/ARCHITECTURE.md` described it as planned; it stayed unbuilt until
now.

- **New**: `app/Domain/Users/Models/UserSetting.php`, `Http/Requests/UpdateUserSettingsRequest.php`,
  `Http/Resources/UserSettingResource.php`, `Http/Controllers/SettingsController.php`,
  `GET`/`PUT /user/settings`. `User::settings(): HasOne` added alongside the existing
  `studySessions()` relation.
- **No row exists until first touch** — `SettingsController`'s private `findOrCreate()` creates one
  lazily (not at registration; most students may never open Settings) with explicit default values
  matching the migration's own DB defaults (`default_duration_minutes: 25`, `auto_breaks`/
  `notifications_enabled: true`) — deliberately **not** a bare `firstOrCreate(['user_id' => ...], [])`
  relying on DB-level defaults, since this codebase has hit the "`Model::create()` doesn't reflect a
  DB default on the in-memory model" gotcha several times already (see `ARCHITECTURE.md`'s Models
  section). Setting them explicitly sidesteps it rather than adding a `->refresh()` workaround.
- **A fresh instance of a different, related gotcha, caught by the tests themselves**: that same
  lazy-create meant `GET /user/settings` returned `201` on a student's first-ever call (Laravel's
  `ResourceResponse` auto-picks the status off the model's `wasRecentlyCreated` flag — the same
  mechanism documented in `ARCHITECTURE.md`'s testing-gotchas section, just surfacing on a `GET`
  this time instead of a `POST`). Fixed by forcing `200` explicitly in both `show()` and `update()` —
  from the client's side, "get/update my settings" should never vary its status code based on
  whether a row happened to already exist; that's an implementation detail, not part of the contract.
- `default_duration_minutes` validation reuses `StartFocusSessionRequest`'s exact 5-180 bound rather
  than inventing a separate range — a default outside what a session can actually be created with
  wouldn't mean anything.
- **Frontend**: `src/pages/Settings/Settings.tsx` (`/settings`), reached from a new "Session
  Settings" link on `Profile.tsx` (the entry point the mockup itself doesn't show — chosen
  deliberately over a Study-With-Me-screen gear icon, since Settings governs account-level defaults,
  not just one session). `src/components/Toggle.tsx` (new, small, reusable) backs the Auto
  Breaks/Notifications switches. `src/lib/api.ts` gained `apiPut` — this is the first `PUT` call
  this app has needed (admin's `api.ts` already has it; this app's copy had been trimmed down to
  only `GET`/`POST`/`PATCH` since nothing needed `PUT` until now).
- Covered by `tests/Feature/Users/UserSettingsTest.php` — including a same-shape version of the
  "first touch creates defaults, second touch doesn't duplicate the row" check, the `200`-not-`201`
  fix, bounds validation, a partial-update-doesn't-null-other-fields check, and a no-cross-student-
  leakage check.
- **A real positioning bug in `Toggle.tsx`, caught by the user, not by anything automated.** The
  knob's "on" position used `translate-x-5` (20px) assuming the knob's untranslated static-position
  `left` was `0` — but an absolutely-positioned element with no explicit `left` falls back to the
  browser's own static-position calculation, which isn't guaranteed to be `0`, and the knob rendered
  outside the track's rounded bounds in the "on" state. First fix attempt (switching to the
  mathematically-correct `translate-x-[22px]`) only fixed the symmetry, not the underlying issue, and
  the user caught that the knob was still escaping the track. The real fix: stop using `translate-x`
  from an undeclared static position entirely — set `left-0.5`/`left-[22px]` directly for the two
  states instead, which is unambiguous regardless of static-position quirks. Confirmed in the
  compiled CSS (`left:2px` / `left:22px` present, not just that the build succeeded) since this
  session has no way to visually verify it in a browser.

## 4d) The remaining nav destinations — all four are real now

All of these followed the recommended order the user set after Session Settings landed, and none
needed new backend work — the APIs already existed from earlier passes.

- **`SessionSetup.tsx` now reads saved Settings.** Fetches `GET /user/settings` alongside
  `GET /sounds` on mount. If the saved `default_duration_minutes` matches one of the three preset
  cards (25/50/90), that card is pre-selected; otherwise the screen falls into **Custom** with the
  saved value pre-filled — deliberately not silently snapping to the nearest preset and losing what
  the student actually saved. `default_sound_id` pre-selects that sound if it's still in the active
  list (falls back to the first available sound, same as before, if the saved one was deactivated
  or never set). Verified live: saved `{duration: 45, sound_id: 1}` (not a preset) via curl, then
  confirmed `GET /user/settings` returns exactly that shape — the same data the Custom-branch logic
  consumes.
- **New: `src/pages/Progress/Progress.tsx`** (`/progress`, now a real bottom-nav/sidebar
  destination — was `path: null`/"Coming soon" before). No new backend endpoint — everything comes
  from `GET /study-sessions` (already fetched this way by `Home.tsx`'s progress card) plus one
  **real, pre-existing** field: `user.weekly_goal_minutes` (default 300 = 5h on the `User` model,
  confirmed via `GET /user` — nothing writes to it yet, but the value itself is genuine, not
  fabricated, so showing progress against it is honest). Computes total completed sessions, total
  study time, a weekly-goal progress bar, and a recent-sessions list (sound name resolved by
  cross-referencing `GET /sounds`).
- **New: `src/pages/Flashcards/Flashcards.tsx`** (`/flashcards`, now wired from both Home's tile
  and the nav — was disabled "Coming soon" before). A one-card-at-a-time review loop:
  `GET /flashcards/due` for the queue, tap to reveal the answer, then one of four quality buttons
  (Forgot/Hard/Good/Easy, mapped to the backend's raw `0-5` SM-2 `quality` scorer at representative
  values 1/3/4/5 — asking a student to pick a number 0-5 directly would mean nothing to them) calls
  `POST /flashcards/{id}/review` and advances the queue. Verified live: reviewed a real seeded card,
  confirmed the due count actually dropped (5 → 4) on a fresh `GET /flashcards/due`, not just
  removed from local React state — the backend's own `next_review_at` logic is what's actually
  driving the queue shrinking, confirmed independently of the frontend.
- **Fixed in the same pass**: `BottomNav.tsx`/`Sidebar.tsx` had a defensive "disabled nav item"
  rendering branch (gray, `cursor-not-allowed`, no link) for when `NAV_ITEMS` had any `path: null`
  entries. Once Progress became real, no item had `path: null` anymore, and TypeScript correctly
  flagged the now-dead branch as unreachable (`item` narrowed to `never` inside it) — removed rather
  than silenced, since it's genuinely dead code now, not a type-checker false positive.
- `src/components/icons.tsx` gained `ChartIcon` (Progress's nav icon — deliberately not reusing
  `CardsIcon`, which Flashcards' own tile already uses; two different destinations sharing one icon
  would be confusing, not just inconsistent).

## 4e) Study Library — the last tile with a real backend behind it

`src/pages/StudyLibrary/StudyLibrary.tsx` (`/study-library`), read-only subset of
`admin/src/lib/studyLibrary.ts`/`types/studyLibrary.ts` (no Create/Update payloads — this app never
writes to this domain, the backend already filters drafts out for non-admins via
`StudyMaterial::visibleToStudents()`).

- **One screen, four drill-down levels** (Subjects → Topics → Materials → Detail), not four separate
  routes — local `level` state + the same back-chevron pattern `SessionSetup.tsx` already uses, one
  level deeper. A real URL per level would be more plumbing for something that's fundamentally "pop
  one level back."
- **Subjects filtered to the student's own `track`** when it's set (`GET /study-library/subjects
  ?track=`) — confirmed this filter exists on the backend before relying on it. Falls back to every
  subject if `track` is `null` (the seeded test student has no track set, so this path was exercised
  live, not just the happy path).
- **Handles all four `MaterialType`s**, including `tip` — note/tip render as body text, video/audio
  render as an "Open video/audio" external link (no inline player; the backend doesn't guarantee
  `url` points to a directly-embeddable file vs. a YouTube-style link, so linking out is the honest
  choice over guessing at embed behavior). Verified live against a **real seeded `tip` material**
  (left over from this session's earlier lecturer-portal testing) — confirmed it renders as text, not
  mishandled as a broken URL link, and that `status`/`published_at` are genuinely absent from the
  response (not just typed as absent).
- `src/components/icons.tsx` gained `VideoIcon`, `AlertIcon` (tip), `AudioIcon`, `FolderIcon` — the
  material-type icon set this screen needed that nothing earlier in this app had required yet.

**AI Practice was paused here for a product decision — now resolved and built, see §4f.**

## 4f) AI Practice — a genuinely new backend domain, provider-agnostic

Unlike every other tile this session, AI Practice had no backend at all. Three decisions were
confirmed with the user before writing any of it: generate from real published `StudyMaterial`
content (not generic from a topic name), persist sets/answers from the start (not ephemeral, so
`Progress.tsx` can show practice accuracy), and leave the actual LLM provider undecided — built
behind an interface so the rest of the feature didn't have to wait.

- **New backend domain**: `api/app/Domain/AiPractice/` — 3 tables (`ai_practice_sets`,
  `ai_practice_questions`, `ai_practice_answers`, the last one append-only like `StudySession`),
  `GeneratePracticeSetAction`/`AnswerPracticeQuestionAction`, `GET`/`POST /ai-practice/sets`,
  `POST /ai-practice/questions/{id}/answer`. Full details and the request/response shapes are in
  `api/docs/API_REFERENCE.md`'s new AiPractice section — not duplicated here.
- **The provider seam**: a `QuestionGenerator` interface, bound in `AppServiceProvider` to
  `TemplateQuestionGenerator` — a real, working, **non-AI** fill-in-the-blank generator built from
  a topic's own material text, not a fake stub. Every generated question's `explanation` says
  "Template-generated, not AI" explicitly, in both the API response and the UI — never silently
  mistaken for the real feature. Swapping to a real LLM later is one new class plus a one-line
  binding change; see `api/docs/ARCHITECTURE.md`'s new AiPractice section for the full reasoning
  and what's still needed then (rate-limiting, specifically — not needed today since the template
  generator costs nothing).
- **A real gap caught mid-build, not after**: the first version of `AiPracticeQuestionResource`
  only revealed `correct_option`/`explanation` once answered — enough to show the right answer, but
  nothing told the caller whether *this student* actually got it right. `Progress.tsx`'s planned
  "Recent Practice" score had nothing to compute from. Fixed by adding `my_selected_option`/
  `my_answer_correct` to the same conditional-reveal shape, reading the student's own (latest, if
  they re-answered) `AiPracticeAnswer` row.
- **Frontend**: `src/pages/AiPractice/AiPractice.tsx` (`/ai-practice`) — Subject → Topic picker
  (reuses `getSubjects()`/`getTopics()` from `lib/studyLibrary.ts`, no new topic-fetching code) →
  generate → one-question-at-a-time review with immediate correct/incorrect + explanation (same
  reveal rhythm `Flashcards.tsx` already established) → an end-of-set summary. `Progress.tsx`
  gained a "Recent Practice" section alongside its existing "Recent Sessions" — the actual payoff
  of persisting from the start; a practice-history fetch failure is caught independently so it
  can't take down the session stats this screen's main job is to show.
- Covered by `tests/Feature/AiPractice/GeneratePracticeSetTest.php` (happy path, 422 on zero
  published materials, 5-question cap, video/audio materials with no body text still produce a
  question) and `AnswerPracticeQuestionTest.php` (correct/incorrect scoring, option-range validation,
  the reveal-on-refetch behavior including `my_selected_option`/`my_answer_correct`, cross-student
  privacy).

## 4g) Onboarding + Support — the last mockup screen, and a new student <-> admin channel

**Onboarding** (`src/pages/Onboarding/Onboarding.tsx`, `/welcome`) — the mockup's 8th screen,
deferred by the user's own earlier instruction until "the app is done." A 4-slide carousel (brand
moment, then Study With Me, AI Practice + Flashcards, and Progress — every slide after the first
describes a feature that's actually built and working, not aspirational copy), each backed by a
real illustration (`public/images/onboarding/*.svg`), not a simple line icon — no AI image
generation was available in this environment, so these are free, MIT-licensed unDraw
illustrations (sourced via the `undraw-svg` npm package, used one-off to extract four files then
immediately removed — the app doesn't need the other ~1,880 as a dependency) with each file's one
designated accent hex swapped to Clinova's brand teal (`#0E7C6B`) via a single `sed` replacement;
skin tones and neutral grays were identified per-file first and deliberately left untouched so the
recolor reads as "on-brand," not broken. A **post-signup welcome tour, not a pre-auth gate** — the route lives inside
`AuthGate` (requires a real session, same as every other screen), and `SignUp.tsx` is the one and
only place that navigates here, immediately after a successful *registration*; signing in never
does. (An earlier version of this showed onboarding to any unauthenticated visitor before
sign-in/sign-up — corrected after the user clarified the intended flow was post-signup, not
pre-auth; worth knowing if an old build or a stale bundle is still showing the wrong order.)

**No "has this been seen" flag anywhere, deliberately.** An even earlier version used a
`localStorage` marker (`lib/onboarding.ts`, since deleted) to stop a browser-back replay of the
carousel. That flag turned out to cause real breakage, not prevent it: once set — including by the
very first pre-auth version of this screen, which marked it on every `/signin` visit — it silently
suppressed onboarding for every *subsequent* genuinely-new signup sharing that same browser, which
is exactly what happened during testing (a fresh signup showed nothing, twice, before this was
traced back to a stale flag). `/welcome` has exactly one entry point in the whole app —
`SignUp.tsx`'s post-registration `navigate()` — so there's no real risk of unwanted replay through
normal navigation; the redundancy of occasionally seeing the carousel twice via browser-back is a
much smaller problem than silently hiding it from a real new user. Uses `GradientBackdrop` — the
same animated multicolor backdrop component Study With Me's setup/active screens already use, not
a new visual system for this one screen.

**Support** (`src/pages/Support/{Support,NewTicket,TicketDetail}.tsx`, `/support`,
`/support/new`, `/support/:id`) — the first genuinely new *backend* domain since AI Practice. A
student reports an issue (subject + category + message), an admin replies from the admin console,
and the student sees the reply — both as a chat-bubble thread at `/support/:id` and as a real
notification (reusing `NotificationBell.tsx`/`GET /notifications` exactly as-is; the only change
there was `NotificationController` projecting an optional `support_ticket_id` so a tapped
notification can deep-link straight into the thread). Full backend design —
schema, the two-controller student/admin split, the fillable-status and DB-default gotchas caught
building it — is in `api/docs/ARCHITECTURE.md`'s own Support section, not duplicated here.
Reachable from `Profile.tsx`'s new "Help & Support" link, alongside the existing "Session
Settings" one.

Covered by `api/tests/Feature/Support/{SupportTicketTest,AdminSupportTicketTest}.php` — 17 tests:
opening a ticket, validation, ownership (a student can't view/reply to another student's ticket),
admin-sees-everything + status filtering, the notify-on-admin-reply/don't-notify-on-student-reply
split (both directions individually tested, not just the happy path), status transitions, and the
admin-only `student_name` field being genuinely absent from the student's own view of their ticket.

## 4h) Time-of-day greeting, and a forgot/reset-password flow that didn't exist on either frontend

**Home.tsx's greeting** was hardcoded `"Good morning"` text, unconditionally, all day — flagged by
the user (based in Ghana, GMT/UTC+0 year-round). Fixed with a plain client-side check against
`new Date().getHours()` — the *browser's* local time, not the server's or any hardcoded timezone,
so it's correct for a student anywhere without per-country logic: morning before 12, afternoon
before 17, evening after.

**Forgot/reset password** — the backend half of this (`POST /forgot-password`,
`POST /reset-password`, standard Laravel Breeze-shape controllers) already existed and was already
tested, but **no frontend, admin or student, had ever had a page for either one.** Worse: the
email-link builder itself was quietly broken — `config('app.frontend_url')` was read by
`AppServiceProvider` but never actually registered in `config/app.php`, so it resolved to `null`
and every reset email ever sent contained a bare path with no host at all. Full story (the config
fix, and making the link role-aware so a student's reset points at this app and an admin's points
at the console) is in `api/docs/ARCHITECTURE.md`'s own "Password reset" section — not duplicated
here.

Student-side, now real: `src/pages/ForgotPassword/ForgotPassword.tsx` (`/forgot-password` — email
in, one neutral "if an account exists..." message out, regardless of whether it actually does, by
design) and `src/pages/ResetPassword/ResetPassword.tsx` (`/password-reset/:token` — matches the
backend's link shape exactly, reads `email` from the query string), plus a "Forgot password?" link
added to `SignIn.tsx`. `lib/auth.ts` gained `forgotPassword()`/`resetPassword()` alongside the
existing `login()`/`register()`.

Verified live, not just build-checked: triggered a real `Password::sendResetLink()` via `tinker`
for both a seeded student and a seeded admin, then read the actual generated link out of the
log-driver mailer (`MAIL_MAILER=log` locally) — confirmed the student's link points at
`127.0.0.1:5174` and the admin's at `localhost:5173`, with a real token and the right email in
each. A new backend test (`PasswordResetTest::test_reset_link_points_at_the_students_own_app_not_admins`)
renders the notification for real instead of `Notification::fake()`-ing it away, specifically so
this exact bug can't come back silently.

**Known gap, not closed by this pass**: the admin console still has no page at this same
`/password-reset/:token` path — its reset emails are now generated correctly but have nowhere to
land yet.

## 4i) PWA support — installable, and the app shell loads offline on repeat visits

A PWA needs three things: HTTPS (already true via Netlify), a **manifest** (a small JSON file
telling the browser the app's name/icons/launch mode), and a **service worker** (a background
script the browser registers once, which is what makes "Add to Home Screen" available at all and
lets the app shell load instantly — even offline — on a repeat visit). None of this existed before
this pass.

**`vite-plugin-pwa`** (new devDependency) generates both from a config block in `vite.config.ts`,
using its default `generateSW` strategy — Workbox builds the service worker and its precache list
automatically from Vite's own build output, so there's no hand-written cache logic to get subtly
wrong. `registerType: "autoUpdate"` means a new deploy's service worker takes over automatically
on the next visit, rather than requiring extra "a new version is available, reload?" UI — the
simpler of the two options, and fine for this app (briefly stale content isn't high-stakes here).

**Icons**: a manifest needs real bitmap (PNG) icons, not the existing SVG logomark alone. Generated
four from it (`public/icons/`, via a one-off Node script using `@resvg/resvg-js` to rasterize, not
checked into the repo): `icon-192.png`/`icon-512.png` (logo centered on white, standard "any"
purpose), `icon-maskable-512.png` (logo at 50% scale on a full-bleed brand-teal background — Android
crops maskable icons into whatever shape the launcher wants, circle/squircle/etc., so content has
to stay inside the center ~80% "safe zone" or it gets clipped), and `apple-touch-icon.png` (180×180,
for iOS specifically — see below).

**iOS gets extra manual tags** in `index.html`: `vite-plugin-pwa` auto-injects the
`<link rel="manifest">` and the service-worker registration script at build time, but Safari
ignores the manifest's own `icons` array for its home-screen icon — it needs the explicit
`<link rel="apple-touch-icon">` tag instead, plus `apple-mobile-web-app-capable`/
`-status-bar-style` meta tags for a standalone (no browser chrome) launch. Android gets standalone
launch from the manifest's own `display: "standalone"` alone.

**Testing note, read before assuming it's broken**: the service worker is disabled under
`npm run dev` by default — Workbox doesn't interact well with Vite's HMR, so this isn't a bug. To
actually see install prompts or offline behavior, build and serve the production bundle:
`npm run build && npm run preview`, then open dev tools' Application/Service Workers panel (or
Lighthouse's PWA audit) against that.

Verified: `npm run build` produces `dist/manifest.webmanifest` (well-formed — `name`, icons array
with the maskable entry's `purpose`, `theme_color` matching the existing `#0e7c6b` brand teal
already in `index.html`'s meta tag), `dist/sw.js` + `dist/workbox-*.js` (Workbox's generated
service worker, precaching 9 entries / ~295 KiB — the full app shell), and confirmed
`dist/index.html` actually contains the injected `<link rel="manifest">` and registration
`<script>` tags, not just that the build didn't error. **Not yet done**: an actual install on a
real phone/browser — same "no browser automation available in this session" gap as everything
else in §5 below, just newly relevant here specifically (an install prompt and offline reload are
real-device/real-browser behaviors, not something a build log confirms).

## 5) Verified

- `php artisan test` — 164/164 (up from 146; Support's two test files added 17 tests this round —
  the first backend-touching pass since AI Practice).
- `npm run build` — compiles clean after every change this pass, including the breakpoint fix, the
  full shell port, and every screen added since, through Onboarding + Support.
- Confirmed the `lg:` breakpoint fix actually works, not just that the build succeeds: grepped the
  compiled CSS for `1024px` media queries before (zero) and after (present) the `@theme` fix.
- Confirmed the `Toggle.tsx` positioning fix the same way: grepped the compiled CSS for `left:2px`/
  `left:22px`, not just trusting the class names were right.
- Full live curl pass as the seeded student: login from the `5174` origin, `GET /sounds`, the
  full `POST /study-sessions` → `PATCH .../finish` → `GET /user` streak-update sequence, sign-up's
  `POST /register` → auto-login → `roles: ["student"]`, notifications' broadcast → `unread_count`
  → mark-all-read sequence, and Settings' first-touch-defaults + partial-update behavior — all from
  earlier passes, still green.
- A live curl pass for this round specifically: saved a non-preset Settings duration (45 min) + a
  real sound, confirmed `GET /user/settings` returns exactly what `SessionSetup.tsx`'s Custom-branch
  logic needs; confirmed `weekly_goal_minutes: 300` is a real, non-fabricated `User` field via
  `GET /user` (what `Progress.tsx`'s goal bar is built on); reviewed a real seeded flashcard via
  `POST /flashcards/1/review` and confirmed the due count actually dropped (5 → 4) on a fresh
  `GET /flashcards/due` — the backend's own spaced-repetition logic driving the queue, not just
  local React state pretending to.
- Admin console's own CORS/Sanctum origin re-confirmed unaffected after every one of this session's
  backend route additions — same live-login check each time, not just trusting the config diff.
- A live curl pass for Study Library specifically: drilled Subject → Topic → Materials as the
  seeded student, landing on a real published `tip`-type material (left over from this session's
  lecturer-portal testing) — confirmed it rendered as the text-body branch, not mishandled as a
  broken URL, and that `status`/`published_at` are genuinely absent from a student's response.
- A live curl pass for AI Practice specifically: generated a real set from topic 1's actual seeded
  materials (including that same `tip`), confirmed the question count and option shape; answered
  one question, confirmed `is_correct`/`correct_option`/`explanation` in the direct answer response;
  re-fetched `GET /ai-practice/sets` and confirmed the answered question now reveals
  `correct_option`/`explanation`/`my_selected_option`/`my_answer_correct` while the unanswered one
  in the same set still shows none of them.
- **Still not done**: a real browser click-through. No browser automation is available in this
  session — visual fidelity against the mockup (and now, against admin's actual desktop layout)
  is a best-effort implementation, not something screenshot-diffed. Worth a manual look.
- **Support/Onboarding specifically**: backend verified via the full `php artisan test` run above
  (real HTTP requests through Laravel's own test client, including the notification-firing and
  ownership checks) and both frontend builds compile clean. A raw-curl live pass (outside the test
  framework) was attempted and hit a Sanctum stateful-auth header quirk specific to the manual curl
  script itself (missing/mismatched `Origin` header) — not a product bug, not pursued further given
  the test suite already exercises the real code paths and the user's own browser-based logins have
  worked throughout this project. Still: this feature specifically has not been clicked through in
  a real browser, same gap as everything else in this section.

## 6) Best place to resume

1. **A real manual/visual pass first** — nothing here has been seen rendered in an actual browser,
   and there are now seven screens' worth of layout (Settings, Progress, Flashcards, Study Library,
   AI Practice, plus the responsive shell) riding on that same unverified assumption. This is the
   single highest-value thing to do before building anything further.
2. ~~Session Settings~~ / ~~Study Progress~~ / ~~Flashcards~~ / ~~SessionSetup reads saved
   defaults~~ / ~~Study Library~~ / ~~AI Practice~~ — all done (§4c–§4f). **Every Home tile and nav
   destination is real now.** There is no remaining "Coming soon" placeholder anywhere in this app.
3. ~~A real LLM provider for AI Practice~~ — done. `GeminiQuestionGenerator` is the bound
   implementation as of 2026-10-08 (Google's free-tier Gemini API), falling back to
   `TemplateQuestionGenerator` automatically on any failure. See `api/docs/ARCHITECTURE.md`'s
   AiPractice section. Rate-limiting `POST /ai-practice/sets` is still the one piece explicitly not
   done yet, flagged there as needed once this sees real traffic.
4. **Flashcards is pull-only, not push** — confirmed during the Flashcards pass: publishing a deck in
   the admin console makes its cards show up in a student's `GET /flashcards/due` immediately (no
   delay, no sync step — a freshly-published card has no review history for anyone, so it's due for
   everyone right away), but nothing *notifies* a student that new cards landed. If "lecturer
   published new flashcards" should trigger a real notification (same bell/badge `NotificationBell.tsx`
   already has for Announcements), that's a genuinely separate feature — deck-publish doesn't fire
   the same `AdminActionPerformed` path announcements use today. The same gap now also applies to AI
   Practice-worthy new content, for the same reason.
5. ~~The onboarding/marketing screen~~ (mockup's 8th screen) — done, §4g. The manual visual pass
   (#1) is now the one genuinely remaining item from the original mockup's scope.
6. **Support's "lecturer/admin content doesn't push-notify" cousin gap, from item #4, is now
   half-closed** — a support reply *does* push-notify (that's the whole feature), proving the
   pattern works end to end. Flashcard/AI-Practice-publish notifications are still the one
   remaining instance of that gap, unchanged by this round.
7. **PWA install, on a real device** (§4i) — `npm run build` confirms the manifest/service worker
   are generated correctly, but nobody has actually tapped "Add to Home Screen" on a phone yet.
   Once deployed to Netlify, worth checking: does an install prompt actually appear (Android
   Chrome), does `apple-touch-icon.png` show up right on iOS's home screen, and does a second
   offline-ish visit actually load instantly from the service worker's cache.
