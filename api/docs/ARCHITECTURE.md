# Clinova API — DDD-Inspired Architecture

Status: **all six built domains have automated tests** — 61 PHPUnit tests across `Users`, `StudyLibrary`, `Flashcards`, `SoundLibrary`, `StudySessions`, `Admin`, all passing, running against in-memory SQLite in ~7 seconds. `Admin` closed a loop deliberately left open since Sheet 05: `PublishStudyMaterialAction`/`PublishFlashcardDeckAction` now fire a shared `AdminActionPerformed` event (`Domain/Shared/Events`), logged by `Admin`'s `LogAdminActivity` listener — neither publishing Action imports anything from `Admin`. `Admin` also closed a real functional gap (user suspension had no persisted state, only token revocation) and was the first domain to exercise the *actual* `/login` endpoint rather than a Tinker-minted token — see the Sanctum section below, worth reading before building the React frontend. A Postman collection covering every endpoint lives in `docs/postman/`. `AiPractice` is the one domain left (external LLM dependency — deliberately deferred to its own focused pass, see [Rollout](#rollout--what-we-skipped)).

## Why this, and not plain MVC or full DDD

Plain Laravel MVC (`app/Models` + `app/Http/Controllers` as flat, type-based folders) works fine until the domain grows — at ~10 tables and 6 feature areas, a flat `app/Models` folder full of `Topic.php`, `Flashcard.php`, `QuizAttempt.php`, `Sound.php` etc. stops telling you anything about how the product is organized, and controllers start accumulating business logic because there's no obvious "correct" home for it.

Full textbook DDD (aggregate roots, repository interfaces abstracting the ORM, domain events for every state change, a CQRS split) is the other extreme — it buys isolation and testability at the cost of ceremony, and Clinova's domain doesn't have the kind of deep, invariant-heavy business rules that justify it. We're not swapping databases, we don't have multiple teams stepping on each other, and Eloquent is not the enemy.

**What we're doing instead:** organize by *feature/domain* instead of by *type*, keep Eloquent as the persistence layer (no repository abstraction), and pull business logic out of controllers into single-purpose **Action** classes. This is the pattern popularized as "Laravel Beyond CRUD" — DDD's vocabulary and folder discipline, without its full machinery.

## The four concerns, and what each one is allowed to do

### Http — `Domain/{X}/Http/`
Accept the request, validate its shape, check authorization, translate to/from JSON.
**Must not:** contain business logic, or query the database directly.

### Actions — `Domain/{X}/Actions/`
One class = one use case (a verb — `StartFocusSessionAction`, `ApproveQuizQuestionAction`). Orchestrates models, fires events, returns a result.
**Must not:** know anything about HTTP — no `Request`/`Response` objects in an Action's signature.

### Models — `Domain/{X}/Models/`
Eloquent models — persistence, relationships, casts, simple self-contained behavior (e.g. `StudySession::markComplete()`).
**Must not:** orchestrate multi-step workflows that touch other domains — that's an Action's job.

**Convention every domain model needs:** Laravel guesses a model's factory by mirroring its namespace under `Database\Factories\`, which only works for the default flat `App\Models\`. Moving models into `Domain/{X}/Models/` breaks that guess in both directions (model→factory *and* factory→model). Rather than fight it, every model gets an explicit `#[UseFactory(SomeFactory::class)]` attribute, and factories stay flat in `database/factories/` as normal:

```php
use Illuminate\Database\Eloquent\Attributes\UseFactory;
use Database\Factories\TopicFactory;

#[UseFactory(TopicFactory::class)]
class Topic extends Model { /* ... */ }
```

This was learned by hitting the error while wiring up `User`, not designed upfront — worth knowing before it costs you the same half hour on the second model.

**Two more conventions learned while building `StudyLibrary`, both caught by testing over real HTTP rather than just linting — neither would have shown up any other way:**

- **Any field an Action sets via `->update([...])` must be in the model's `#[Fillable(...)]` list, even if no Form Request ever validates that field from client input.** Laravel's mass-assignment protection silently drops non-fillable keys — no exception, no error, the call just quietly does nothing. `PublishStudyMaterialAction` calling `$material->update(['status' => ..., 'published_at' => ...])` did nothing until both keys were added to `StudyMaterial`'s `Fillable` attribute. This is safe to do broadly, not a security hole, *as long as* your Form Requests only validate the fields a client should be able to set — `Fillable` controls what a trusted server-side `update()` call can touch, the Form Request's `rules()` controls what a client's request body can touch. Two different jobs; don't rely on one to do the other's.
- **`created_at`/`updated_at` are deliberately never in `#[Fillable(...)]`** (no normal app code should ever let a caller backdate a record), which means `create()`/`update()` with those keys gets silently dropped the same way. When a seeder genuinely needs a specific timestamp — e.g. spreading fake signups across the last 30 days so an admin-dashboard chart has something real to show instead of one data point — use `$model->forceFill(['created_at' => $date, 'updated_at' => $date])->save()`, which deliberately bypasses the fillable guard. Reach for this only in seeders/factories, never in request-handling code.
- **Give every unique/composite-unique column an auto-generation hook on the model if callers won't always supply it.** `subjects.slug` and `topics.slug` are required + unique in the migration, but nothing upstream (controller, factory-less create) generates one. Solved with a `static::creating()` hook on the model itself (see `Subject::booted()` / `Topic::booted()`) — self-contained model behavior per the table above, not an Action, since it's a derived-value default, not a use case.

**A third one, hit twice more while building `Flashcards`, which upgrades it from "one weird bug" to a hard rule:**

- **`Model::create()` and `firstOrCreate()` never populate a column's DB-level default on the in-memory model — only an explicit re-fetch does.** If a migration says `->default('draft')` or `->default(2.5)` and the calling code doesn't pass that key, the object handed back has `null` there, not the default, until something calls `->refresh()` or re-queries. This bit `FlashcardDeckController::store()` (status came back `null`, not `'draft'`, crashing the Resource) and — once the pattern was known — an audit found it *already lurking* in `StudyMaterialController::store()` too, unexercised until then because no earlier test had hit that specific store→immediately-serialize path. It then hit a third time inside `ReviewFlashcardAction`, where `UserFlashcardProgress::firstOrCreate()`'s freshly-created row had `ease_factor = null` and `interval_days = null` instead of `2.5`/`0`, quietly wrecking the very first review's math (ease factor floored at 1.3 instead of computing from 2.5). It then hit a *fourth and fifth* time — `FlashcardController::store()` and `TopicController::store()` both left `order` (`->default(0)`) as `null` on an omitted-order create, caught only by manually curling the frontend's wiring against the real API, not by this suite, because neither controller had a create-endpoint test at all until that audit added one.
  **The rule now:** any column with a DB-level default that code reads back immediately after `create()`/`firstOrCreate()` must have that default spelled out explicitly in the call — in `firstOrCreate()`'s second array, or as an explicit key in `create()`. Never trust the migration's `->default(...)` to be reflected on the object Eloquent just handed you. **And:** every `store()` endpoint needs at least one test that actually asserts on the created object's defaulted fields, not just that the row exists — "hit twice, then three more times" is what happens when that's skipped.

The pattern worth internalizing from all three: **a green `php -l` and a clean `composer dump-autoload` prove the code parses and autoloads — neither proves it does the right thing.** Every domain from here on gets the same real-HTTP verification pass (seed → mint a Sanctum token → curl the actual endpoints as both roles, and specifically exercise every `store()`/`firstOrCreate()` path, not just the ones seeded data already covers) before being called done.

### Events/Listeners — `Domain/{X}/Events/`
How domains talk to each other *without* importing each other's Actions directly.
**Must not:** replace a direct call when the coupling is already intentional (e.g. AI Practice reading `Topic`).

Every ellipse on Sheet 02's use-case diagram maps to roughly one Action class — that diagram was effectively an early draft of this Actions list.

## Folder structure

```
api/
├── app/
│   ├── Domain/
│   │   ├── Users/                         # accounts, auth, onboarding, settings
│   │   │   ├── Models/                    #   User, UserSetting
│   │   │   ├── Actions/                   #   RegisterUserAction, CompleteOnboardingAction,
│   │   │   │                              #   UpdateUserSettingsAction, UpdateStreakAction
│   │   │   ├── Http/
│   │   │   │   ├── Controllers/           #   AuthController, OnboardingController, SettingsController
│   │   │   │   ├── Requests/               #   RegisterRequest, CompleteOnboardingRequest
│   │   │   │   └── Resources/              #   UserResource
│   │   │   ├── Policies/                  #   UserPolicy (admin acting on another user)
│   │   │   └── routes.php
│   │   │
│   │   ├── StudyLibrary/                  # subjects, topics, notes/video/audio
│   │   │   ├── Models/                    #   Subject, Topic, StudyMaterial
│   │   │   ├── Actions/                   #   PublishStudyMaterialAction, CreateTopicAction,
│   │   │   │                              #   ReorderTopicsAction
│   │   │   ├── Http/{Controllers,Requests,Resources}/
│   │   │   ├── Policies/                  #   StudyMaterialPolicy
│   │   │   └── routes.php
│   │   │
│   │   ├── Flashcards/
│   │   │   ├── Models/                    #   FlashcardDeck, Flashcard, UserFlashcardProgress
│   │   │   ├── Actions/                   #   CreateDeckAction, ReviewFlashcardAction (SRS scheduling)
│   │   │   ├── Http/{Controllers,Requests,Resources}/
│   │   │   ├── Policies/
│   │   │   └── routes.php
│   │   │
│   │   ├── StudySessions/                 # "Study With Me" — the flagship feature
│   │   │   ├── Models/                    #   StudySession
│   │   │   ├── Actions/                   #   StartFocusSessionAction, CompleteFocusSessionAction,
│   │   │   │                              #   AbandonFocusSessionAction
│   │   │   ├── Events/                    #   FocusSessionCompleted
│   │   │   ├── Http/{Controllers,Requests,Resources}/
│   │   │   └── routes.php
│   │   │
│   │   ├── AiPractice/
│   │   │   ├── Models/                    #   QuizQuestion, QuizAttempt, QuizAttemptAnswer
│   │   │   ├── Actions/                   #   RequestQuestionSetAction, SubmitQuizAnswerAction,
│   │   │   │                              #   ApproveQuizQuestionAction, RecommendWeakTopicsAction
│   │   │   ├── Services/                  #   AiPracticeService — the ONLY class that calls the LLM
│   │   │   ├── Jobs/                      #   GenerateQuestionsJob (queued, calls AiPracticeService)
│   │   │   ├── Http/{Controllers,Requests,Resources}/
│   │   │   ├── Policies/                  #   QuizQuestionPolicy (admin approve/reject)
│   │   │   └── routes.php
│   │   │
│   │   ├── SoundLibrary/
│   │   │   ├── Models/                    #   Sound
│   │   │   ├── Actions/                   #   UploadSoundAction, DeactivateSoundAction
│   │   │   ├── Http/{Controllers,Requests,Resources}/
│   │   │   └── routes.php
│   │   │
│   │   ├── Admin/                         # cross-cutting admin operations
│   │   │   ├── Models/                    #   AdminActivityLog
│   │   │   ├── Actions/                   #   SuspendUserAction, BroadcastAnnouncementAction,
│   │   │   │                              #   LogAdminActivityAction, GetOverviewMetricsAction
│   │   │   ├── Notifications/             #   AnnouncementNotification
│   │   │   ├── Listeners/                 #   LogsEveryDomainEvent (subscribes to other domains' events)
│   │   │   ├── Http/{Controllers,Requests,Resources}/
│   │   │   └── routes.php
│   │   │
│   │   └── Shared/                        # domain concepts used by 2+ domains — NOT a dumping ground
│   │       └── Enums/                     #   Track (nursing/midwifery), ContentStatus (draft/in_review/published)
│   │
│   ├── Http/
│   │   └── Controllers/
│   │       └── Controller.php             # the one framework base class every domain controller extends
│   │
│   ├── Support/                           # generic, non-domain dev tooling
│   │   ├── Actions/Action.php             #   base contract: abstract handle()
│   │   └── Http/ApiResponse.php           #   consistent JSON envelope helper
│   │
│   └── Providers/                         # framework-level, unchanged
│
├── routes/
│   └── api.php                            # thin aggregator — requires each Domain/{X}/routes.php
│
└── database/
    └── migrations/                        # unchanged — migrations stay flat, they're infrastructure, not domain code
```

Nothing here requires a `composer.json` change — `App\` already maps to `app/`, so `App\Domain\StudySessions\Models\StudySession` resolves automatically once the file exists at `app/Domain/StudySessions/Models/StudySession.php`.

## Walking a request all the way through: "Start a focus session"

This is Flow 3.2 from the blueprint, traced through the folders above — request in from React, JSON back out.

```
React (Axios)
  │  POST /api/study-sessions   { duration: 50, sound_id: 4 }
  ▼
routes/api.php
  │  requires Domain/StudySessions/routes.php
  ▼
Middleware pipeline
  │  auth:sanctum → confirms the Sanctum cookie session
  │  throttle, etc.
  ▼
Domain/StudySessions/Http/Controllers/StudySessionController@store
  │  1. type-hints StartFocusSessionRequest — validates shape,
  │     and the Request's authorize() calls the Policy
  │  2. calls app(StartFocusSessionAction::class)->handle($user, $data)
  │  3. wraps the returned model in StudySessionResource
  ▼
Domain/StudySessions/Actions/StartFocusSessionAction::handle()
  │  — the actual use case, framework-agnostic —
  │  1. creates the StudySession row (started_at = now, completed = false)
  │  2. returns the model back to the controller
  ▼
Domain/StudySessions/Models/StudySession (Eloquent)
  │  persists to MySQL
  ▼
back up through Resource → Controller → JSON response
  ▼
React (TanStack Query) receives { id, started_at, planned_minutes, sound: {...} }
```

Completing the session later is the same shape through `CompleteFocusSessionAction`, except that Action does one more thing worth calling out: it fires a `FocusSessionCompleted` event instead of directly calling into the `Users` domain to update the streak. A `Domain/Users/Listeners/UpdateStreakOnSessionCompleted` listener picks that up. **That's the actual payoff of this structure** — `StudySessions` never imports anything from `Users`, so either domain can change internally without breaking the other, and if a future feature ("email a congrats note on a 7-day streak") needs to hook the same event, it's a new listenerY not a new line inside `CompleteFocusSessionAction`.

The rule of thumb we're using: **direct Action-to-Action calls are fine when the coupling is already intentional** (e.g. `AiPractice` reading `StudyLibrary`'s `Topic` model directly — a quiz always belongs to a topic, that's not incidental). **Events are for side effects that a domain shouldn't need to know are happening** (streaks, notifications, admin audit logging).

## Traceability back to the blueprint

| Domain folder | ERD tables (Sheet 05) | Use cases (Sheet 02) |
|---|---|---|
| `Users` | `users`, `user_settings` | Sign Up & Choose Track, Manage Users |
| `StudyLibrary` | `subjects`, `topics`, `study_materials` | Browse Study Library, Manage Content & Decks |
| `Flashcards` | `flashcard_decks`, `flashcards`, `user_flashcard_progress` | Review Flashcards, Manage Content & Decks |
| `StudySessions` | `study_sessions` | Run Focus Session |
| `AiPractice` | `quiz_questions`, `quiz_attempts`, `quiz_attempt_answers` | Take AI Practice Quiz, Curate AI Question Bank |
| `SoundLibrary` | `sounds` | Curate Sound Library |
| `Admin` | `admin_activity_logs`, (reads across all) | Manage Users, View Analytics & Broadcast |

Every table from Sheet 05 has exactly one owning domain — that 1:1 mapping is what makes this structure sound instead of arbitrary.

## Sanctum SPA auth — what actually happens on login

Every domain before `Admin` was tested by minting a Sanctum personal-access token directly in Tinker (`$user->createToken(...)`) and sending it as an `Authorization: Bearer` header — a legitimate way to test an API, but it completely bypasses `/api/login`, which works differently and is what the real React frontend will actually use.

`AuthenticatedSessionController::store()` calls `$request->session()->regenerate()` — this is **cookie/session-based auth** (the "SPA" pattern Sanctum is built around), not token auth. A plain `curl -X POST /api/login` with no other setup gets a 500 ("Session store not set on request"), because Sanctum's `EnsureFrontendRequestsAreStateful` middleware only attaches a session to requests it recognizes as coming from a trusted frontend — and "trusted" is decided by the request's `Origin`/`Referer` header matching an entry in `config('sanctum.stateful')` (`localhost`, `127.0.0.1`, etc. by default), not by anything else. No matching header, no session, and the controller's `$request->session()` call has nothing to operate on.

The real flow, which we proved works by simulating it with curl's cookie jar:
1. `GET /sanctum/csrf-cookie` first — sets an `XSRF-TOKEN` cookie and a `laravel-session` cookie.
2. `POST /api/login` with that cookie jar attached, the `XSRF-TOKEN` value echoed back as an `X-XSRF-TOKEN` header, and an `Origin` header matching a stateful domain — returns `204`.
3. Every request after that just needs the session cookie attached (`Origin` still has to match) — no bearer token anywhere.

**What this means for the React app(s) later:** Axios needs `withCredentials: true` (or fetch's `credentials: 'include'`) so the browser actually sends/receives these cookies, the frontend's dev origin (Vite's default is `localhost:5173`) needs to be in `SANCTUM_STATEFUL_DOMAINS`, and the CSRF-cookie request has to happen once before the first login attempt. None of this applies to the Bearer-token testing pattern we've used throughout — that's a second, independent auth method Sanctum supports (useful for non-browser clients), not what the student/admin web app will actually use.

**Two frontends, one API, as of 2026-10-06.** The student app (`../student`) runs on port `5174` alongside the admin console's `5173`, both talking to this same backend. `config/cors.php`'s `allowed_origins` used to read a single `FRONTEND_URL` env var — too narrow for two origins — so it now reads a comma-separated `FRONTEND_URLS` instead (`array_filter(explode(',', env('FRONTEND_URLS', env('FRONTEND_URL', ...))))`), with `FRONTEND_URL` kept only as that fallback for compatibility. `SANCTUM_STATEFUL_DOMAINS` already natively supported a comma-separated list (nothing to change there beyond adding the second port). Both are set in `.env`: `FRONTEND_URLS=http://localhost:5173,http://localhost:5174` and `SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:5174`. Adding a third frontend later is the same pattern — append to both comma-separated values, nothing structural to change.

## Role model — three tiers as of 2026-10-06, and where the split actually lives

Started as two Spatie roles (`student`, `admin`); a third, `lecturer`, was added to let lecturers manage curriculum content without the full admin blast radius (user management, platform-wide announcements, activity log, analytics). The split is **not** "admin minus some routes" scattered across a dozen ad-hoc checks — it's one chokepoint plus one explicit exception list:

- `User::canManageStudyContent(): bool` (`app/Domain/Users/Models/User.php`) returns `hasAnyRole(['admin', 'lecturer'])`. Every Policy/FormRequest/controller check in StudyLibrary and Flashcards that used to say `hasRole('admin')` now calls this instead — Policies (`StudyMaterialPolicy`, `FlashcardDeckPolicy`), the Subject/Topic FormRequests (no Policy class backs those), the two controllers' draft-visibility bypass, and the two Resources' conditional `status`/`published_at` fields.
- Route middleware for those two domains' inner admin-only groups is `role:admin|lecturer` (pipe — Spatie's `RoleMiddleware` reserves a comma-separated second argument for an explicit guard name, so `role:admin,lecturer` is not the same thing and silently means something else).
- Everywhere else — `Admin/routes.php` (users, lecturers, announcements, activity log, analytics) and `SoundLibrary/routes.php` — deliberately stayed plain `hasRole('admin')`/`role:admin`. These are the exception list: content management is shared, platform administration isn't.

**The one rule for extending this later:** if a new permission is genuinely "can this account manage curriculum content," call `canManageStudyContent()` — don't add a third `hasAnyRole([...])` spelling of the same pairing somewhere else. If it's a *different* grouping (a hypothetical fourth role that can manage Sound Library but not Flashcards, say), that's a new, differently-named helper, not an argument for making this one more generic — see its own docblock for why it's deliberately not called something broader like `isPrivileged()`.

**A mass-assignment gotcha found writing `LecturerManagementController::store()`:** `email_verified_at` is deliberately *not* in `User`'s `#[Fillable(...)]` list (normal app code should never mass-assign it), so passing it inside `User::create([...])`'s array silently no-ops — the column stays `null`, no error, no warning. This is the mass-assignment sibling of the "`Model::create()` doesn't reflect a DB-level default" gotcha already documented under Models above; same symptom (a field you just set reads back as `null`), different cause (fillable guard, not a missing re-fetch). Fix is the same shape as that one: set it after the fact — `$lecturer->forceFill(['email_verified_at' => now()])->save();` — rather than fighting the guard. Caught by `AdminLecturerManagementTest::test_admin_can_create_a_lecturer`'s own assertion, not discovered by inspection.

## AiPractice — the first interface-bound swappable service in this codebase

Every other domain calls its own database or another domain's models directly — there's never been
a reason to abstract *what* does the work, only to organize *where* the code calling it lives (the
Http/Actions/Models split §"The four concerns" above). `AiPractice` (student app, added 2026-10-08)
is the first domain where the actual implementation genuinely needs to be swappable: which LLM
provider (if any) generates practice questions was an open product decision, and the rest of the
feature — schema, persistence, scoring, the review UI — couldn't wait on that decision being made.

The seam: `app/Domain/AiPractice/Contracts/QuestionGenerator.php` is a one-method interface
(`generate(Topic $topic, Collection $materials): array`). `GeneratePracticeSetAction` depends on
that interface via constructor injection, never on a concrete class. `AppServiceProvider::register()`
binds it to a concrete implementation:
```php
$this->app->bind(QuestionGenerator::class, GeminiQuestionGenerator::class);
```
As of 2026-10-08 this is a real LLM call: `app/Domain/AiPractice/Generators/GeminiQuestionGenerator.php`
calls Google's Gemini API (free tier — `GEMINI_API_KEY`/`GEMINI_MODEL` in `.env`, read via
`config/services.php`'s `gemini` key, server-side only, never shipped to either frontend), using
`responseSchema` to get back structured `{question, options, correct_option, explanation}` JSON
directly rather than hoping the model free-forms valid JSON. It's grounded strictly in the topic's
own published material text (same content-source decision as the template generator), capped at
50 questions per set (`GeneratePracticeSetAction::MAX_QUESTIONS`) — a single material can alone
produce dozens of questions, it's never one-per-material. Both generators are told to return fewer
than the cap rather than inventing content or duplicating a question just to pad the count up.

`GeminiQuestionGenerator` depends on `TemplateQuestionGenerator` as a constructor-injected fallback:
any failure — bad/missing key, network error, a non-2xx response, unparsable output — is caught and
silently falls back to the template generator rather than breaking the feature outright, logging a
warning either way. This matters more here than most external-API integrations because the free
tier genuinely returns transient `503 UNAVAILABLE` ("high demand") under load — confirmed live during
setup, not a hypothetical. A fallback response is still correctly labeled "Template-generated, not
AI" in its `explanation` field, so a fallback is visible in the data, never silently passed off as
real AI output.

`TemplateQuestionGenerator` itself (`app/Domain/AiPractice/Generators/TemplateQuestionGenerator.php`)
remains in the codebase as that fallback, not as the primary path — a real, working fill-in-the-blank
generator built from a topic's own published material text (regex sentence-splitting + picking the
longest word to blank out, with other words from the same text as distractors). No external API, no
cost, no network call.

**Swapping providers again later is the same shape**: write a new class implementing
`QuestionGenerator`, change the one `bind()` line above to point at it, done — `GeneratePracticeSetAction`,
the controllers, the Resources, the frontend, none of it needs to change, because none of it knows
which generator is actually running. Still worth adding if practice-set generation sees real
traffic: rate-limiting (Laravel's `throttle` middleware) on `POST /ai-practice/sets`, since every
non-fallback call now has real per-request cost and a shared free-tier rate limit across all
students — not enforced yet, noted here so it isn't forgotten.

**Slides materials (added 2026-10-29) are sent to Gemini as a real document, not extracted text.**
`StudyMaterial`'s Slides type (an uploaded PDF — the one file-based material type, alongside Note/Tip's
typed text and Video/Audio's pasted URL; see the "Deployment" section below for the Supabase storage
side of this) has no `body` text at all, unlike every other type `buildPrompt()` was written against.
Rather than extracting
text from the PDF first (losing diagrams/layout/charts in the process), `GeminiQuestionGenerator::
buildSlideParts()` reads the file straight from storage and attaches it to the request as a second
`contents[0].parts` entry — `{inlineData: {mimeType: 'application/pdf', data: <base64>}}` — alongside
the usual text prompt, which Gemini's models read natively. Fetched via `Storage::disk(materials_disk)
->get()` directly, not a second HTTP round-trip through Supabase's public URL — the app already holds
S3 credentials, so this is an ordinary authenticated read.

Confirmed live (via `Http::fake()`, not a real round trip — see below for why) that the request this
builds is correct: two parts, the text one mentioning the slide deck's title, the `inlineData` one's
base64 decoding back to a byte-identical copy of the source PDF. **Never got a live successful
response to confirm Gemini's actual behavior against a real multimodal request** — every attempt
during this work, including a plain *text-only* one that doesn't touch any of this new code, hit the
same `503 UNAVAILABLE: high demand` this section already documented as a known real failure mode.
Two real things did come out of hitting that wall repeatedly, though: PHP's `max_execution_time`
(30s default) was killing the request before `Http::timeout()` even got a chance to, and raising that
revealed the HTTP timeout itself (60s) was too short for a PDF-attached call too — both raised (see
`Dockerfile`, `docker/nginx.conf.template`, `public/.user.ini`, and `GeminiQuestionGenerator`'s own
90s `Http::timeout()`), independent of whatever was causing the 503s.

## Support — a student <-> admin channel, split across two controllers on purpose

Added 2026-10-21 alongside the onboarding screen (see student app's `PROJECT_STARTING_POINT.md`
for that half — purely a frontend addition, no backend involved). A student opens a ticket with an
initial message; any admin can reply or move it through `open -> in_progress -> resolved`; an
admin's reply notifies the student through the same notifications pipeline Announcements already
uses.

**Why two controllers for one feature.** `app/Domain/Support/Http/Controllers/SupportTicketController.php`
(student-facing, routed under `/support`) only ever touches the caller's *own* tickets, enforced by
`SupportTicketPolicy`. `app/Domain/Admin/Http/Controllers/SupportTicketController.php` (admin-facing,
routed under `/admin/support`, same admin-only middleware group as `/admin/users`) touches *any*
ticket. Same split `StudyMaterialController` (student-facing) and the rest of the Admin domain's
controllers already establish for other features — "which tickets can this caller see" is a
different question from "what is a ticket," and the two controllers both drive the same
`SupportTicket`/`SupportTicketMessage` models and `Actions` rather than duplicating that logic.

**No "assigned admin" concept.** Any admin can reply to or resolve any student's ticket — same
openness StudyLibrary's admin endpoints already have, not role-partitioned by which specific admin
"owns" a ticket. A real support-ticket-assignment feature (if ever needed) would be additive, not a
redesign of what's here.

**`status` is fillable, not guarded.** The first draft of `SupportTicket` excluded `status` from
`#[Fillable(...)]` on the theory that only `UpdateSupportTicketStatusAction` should ever set it.
That broke two things at once: `UpdateSupportTicketStatusAction`'s plain `update(['status' => ...])`
call silently no-op'd (the mass-assignment guard dropping a field it wasn't told to allow), and so
did the test factory's `resolved()`/`inProgress()` states. Reverted to the same shape
`FlashcardDeck`'s own `status` field already uses: fillable on the model, with the *Form Request*
(`CreateSupportTicketRequest`) never validating `status` as the actual enforcement — client input
genuinely cannot reach it, the model-level guard was solving a problem the Form Request already
solved, redundantly and at a real cost (two different places silently stopped working).

**`Model::create()` doesn't reflect a DB-level default.** `CreateSupportTicketAction` sets
`'status' => TicketStatus::Open` explicitly in the `create([...])` call rather than leaning on the
migration's `->default('open')`. Leaving it out compiles and even persists the correct value to the
database — but the *in-memory* `$ticket` instance `create()` hands back still shows `status: null`
(Eloquent never re-fetches a DB-applied default onto the object it already has), so the resource
returned from `POST /support/tickets` serialized `status: null` on the very first response, before
a page reload would've shown "open" correctly. Same root cause as the `email_verified_at` /
`streak_count` gotchas already documented elsewhere in this file — caught here by the Action's own
test asserting on the immediate response, not by a later bug report.

**Reusing the Notifications pipeline, not building a second one.** `SupportTicketReplyNotification`
(`app/Domain/Support/Notifications/`) is a second class extending Laravel's built-in
`Notification`, `via(): ['database']`, same shape as `AnnouncementNotification`. Nothing about
`NotificationController`, `GET /notifications`, or the frontend's `NotificationBell` changed to
support this — the only new piece anywhere in that pipeline is `NotificationController::index()`
now also projecting an optional `support_ticket_id` out of the notification's `data` column, present
only on this notification type, which is what lets the frontend deep-link a tapped notification
straight into the right ticket's thread instead of just showing text.

**Only an admin's reply notifies.** `ReplyToSupportTicketAction::handle()` checks
`$author->hasRole('admin')` before calling `notify()` — a student replying to their own ticket
doesn't notify themselves. Covered by two tests on opposite sides of this
(`SupportTicketTest::test_a_students_own_reply_does_not_notify_anyone`,
`AdminSupportTicketTest::test_an_admin_reply_notifies_the_student_who_filed_the_ticket`), since a
notification *not* firing is exactly the kind of thing that's easy to accidentally break without
either test catching it.

## Password reset — a registered-but-unwired config key, and a role-aware fix

`config('app.frontend_url')` has been read by `AppServiceProvider::boot()`'s
`ResetPassword::createUrlUsing()` closure since early in this project, building each reset email's
link as `{frontend_url}/password-reset/{token}?email={email}`. What went unnoticed until
2026-10-21: `config/app.php` never actually defined a `'frontend_url'` key at all — `env('FRONTEND_URL')`
existed in `.env` and was read directly by `config/cors.php`, but nothing exposed it under
`config('app.*')`. `config('app.frontend_url')` silently resolved to `null`, so every password
reset email this app ever sent contained a bare `/password-reset/{token}?...` path with no scheme
or host — not a 404, not an exception, just a link that looked plausible in isolation and went
nowhere. `PasswordResetTest.php`'s existing coverage used `Notification::fake()`, which records
that a notification *would* have been sent without ever rendering its actual content — exactly the
kind of gap that lets a broken link ship silently. Caught by reading the real generated link out
of the log-driver mailer (`MAIL_MAILER=log` locally) during manual verification, not by a test;
`PasswordResetTest::test_reset_link_points_at_the_students_own_app_not_admins` now renders the
notification for real (`->toMail($user)->actionUrl`) specifically so this can't regress silently
again.

**Also made role-aware while fixing it.** Two frontends share this backend, so one `frontend_url`
was never going to be enough — `config/app.php` now has both `frontend_url` (admin/lecturer,
existing `FRONTEND_URL` env var) and `student_frontend_url` (new `STUDENT_FRONTEND_URL` env var),
and the `createUrlUsing` closure picks between them based on `$notifiable->hasRole('student')`.
The student app has real pages consuming this now (`/forgot-password`, `/password-reset/:token`,
both public routes, plus a "Forgot password?" link on sign-in) — **the admin console does not**,
a known, not-yet-closed gap: its reset emails now correctly point at `localhost:5173`, but there's
no route there yet to receive them.

## Running locally with file uploads — `php artisan serve` silently caps them at 2MB

`SoundLibrary` added the first real file-upload endpoint (`POST /sounds` with `audio_file`,
alongside the existing `file_url` option). `public/.user.ini` raises `upload_max_filesize`/
`post_max_size` to 20M/25M — but **`.user.ini` only works under Apache/mod_php or PHP-FPM, not
PHP's built-in development server**, and `php artisan serve` runs on that built-in server under
the hood. Starting the API the normal way, uploading anything over PHP's compiled-in 2M default
fails with a generic "The audio file failed to upload" — not a validation error, a PHP-level
`UPLOAD_ERR_INI_SIZE` that Laravel can't distinguish from a real upload failure in the message it
shows.

**The fix for local dev:** `artisan serve`'s `ServeCommand` (checked the actual source, not
assumed) builds its child process as exactly `php -S host:port server.php` — no CLI option exists
to inject `-d` flags through it. But it does pass a specific whitelist of environment variables
through to that child process, and normally strips everything else — *unless* `--no-reload` is
passed, in which case every environment variable passes through unfiltered. `PHP_INI_SCAN_DIR` is
a real PHP mechanism (any SAPI, not just FPM/Apache) for loading extra `.ini` files from a
directory at startup, so this combination actually works:

```
PHP_INI_SCAN_DIR="$(pwd)/.phpini" php artisan serve --no-reload
```

with `api/.phpini/uploads.ini` holding the same two directives as `public/.user.ini`. Verified
with a real 3MB file over actual HTTP, not assumed from reading the source. (An earlier version of
this note claimed there was no way to make `artisan serve` work at all and recommended bypassing
it with a raw `php -S ... -t public` instead — that still works, but turned out to be unnecessary.)

This was only caught by uploading a real file over actual HTTP and getting a cryptic failure —
PHPUnit's `UploadedFile::fake()` goes through Laravel's test kernel, never through real PHP
upload-size enforcement at all, so the test suite passing proves nothing about this specific
failure mode. `public/.user.ini` stays in the repo regardless, since most real deployments
(Apache, Nginx+PHP-FPM, most managed hosts) honor it directly with no extra step.

**Deployment note, a separate gotcha from the one above:** if production sits behind Nginx as a
reverse proxy to PHP-FPM (the standard Laravel setup), Nginx has its *own* independent upload cap
— `client_max_body_size`, defaulting to 1MB — enforced before the request ever reaches PHP, with a
413. Raising PHP's limits doesn't touch this; it needs its own line in the Nginx site config
whenever this actually gets deployed. (`docker/nginx.conf.template` sets this explicitly for the
production image — see "Deployment" below.)

## Deployment — `SOUNDS_DISK`/`MATERIALS_DISK`, and why local disk was never going to work in production

Full how-to is `docs/DEPLOYMENT.md`; this is the *why* behind one specific decision in it.

`SoundController` is the only place in this app that writes an uploaded file. Through local dev
it wrote straight to the `public` disk (`storage/app/public`), which is fine on a machine that
keeps running — but almost every free app-hosting tier (Render's included) runs on an **ephemeral
filesystem**: anything written to local disk is gone on the next redeploy, often on a restart too.
Shipping that as-is would mean every sound upload survives until the next deploy, then silently
vanishes — the exact failure already seen once in dev (a real uploaded file outlived its database
row after an unrelated seeder reset, see `tests/Feature/SoundLibrary/`), except in production
*both* the row and the file would go.

Fix: `config/filesystems.php` gained a `sounds_disk` key (`env('SOUNDS_DISK', 'public')`), and
`SoundController::storeUploadedAudio()` reads the disk name from there instead of hardcoding
`'public'`. Locally this changes nothing (defaults to `public`, same as before). In production,
`SOUNDS_DISK=s3` points it at the **existing** `s3` disk entry in that same config file — already
written generically (`endpoint`/`use_path_style_endpoint` both configurable) specifically so it
works against any S3-compatible provider, not only AWS. Backblaze B2 was the provider picked for
free-no-card object storage; nothing in the app code knows or cares that it isn't AWS.

Why a separate `sounds_disk` key instead of just repointing the framework's own `'default'` disk:
`SoundController` is the *only* caller — confirmed by grepping the whole `app/` tree for
`Storage::disk(`/`->store(` before making this change. Repointing `'default'` would be a global
change justified by a single-feature need; `sounds_disk` scopes the decision to exactly what
needed it.

**Revised 2026-10-23, twice, settling on: public bucket + plain URLs, provider = Supabase
Storage.** The first version of this fix had `storeUploadedAudio()` call
`Storage::disk($disk)->url($path)` once at upload time and store the result permanently in
`file_url` — which only works if the bucket is *publicly* readable. That ran into a real free-tier
wall: Backblaze B2 gates a bucket's first switch to public visibility behind a one-time
card-verification charge, confirmed live when "Public" blocked a deployment explicitly scoped to
free-no-card services mid-setup.

The *second* version switched to a private B2 bucket with presigned reads
(`Storage::disk('s3')->temporaryUrl(...)`) to avoid the card requirement — this is where the real
time went. Presigned reads failed consistently against B2's S3-compatible API: confirmed with raw
`aws-sdk-php` calls that bypassed Laravel/Flysystem entirely (ruling out a wrapper-specific bug),
confirmed the key's capabilities genuinely included `readFiles`, confirmed it wasn't a
signature-version mismatch — `GetObject`/`HeadObject`/`ListObjectsV2` failed every time with
`InvalidAccessKeyId: Malformed Access Key Id` while `PutObject`/`DeleteObject` on the *identical*
credentials mostly succeeded (with enough inconsistency on retests that this looks like
infrastructure-level instability on B2's end, not a client-side config bug worth chasing further).

Rather than keep debugging a provider's internals from the outside, moved to **Supabase Storage**
(also free, also no card, also S3-compatible — same `AWS_*` env var shape, zero code changes to
switch providers) with the bucket set **public**. Supabase offers public buckets as a first-class,
cardless option, and "public" there only affects reads — uploads/deletes still require
authorization via Supabase's RLS policies, so going public costs nothing on the write side. Going
public also means `Sound::resolvedUrl()` no longer needs `temporaryUrl()`/presigned-URL support at
all — just plain `->url($path)` for every disk, local or `s3` alike. That removes signing from the
picture entirely, which is exactly the part that broke with B2. The storage-model split from the
first revision stayed:

- `sounds.file_path` (nullable) holds the raw storage path for an *uploaded* file; `file_url` holds
  a pasted external URL exactly as before. Exactly one of the two is ever set —
  `SoundController::store()`/`update()` explicitly null out whichever one doesn't apply, so a sound
  that switches from a paste to an upload (or back) can't end up with a stale value in the other
  column silently winning later.
- `Sound::resolvedUrl()` is what every caller actually reads (`SoundResource` calls it, nothing
  reads `file_url` directly anymore) — resolved fresh on every call rather than cached, so swapping
  the backing disk/provider again later never leaves a stale URL sitting in the database.

**StudyMaterial's Slides type (added 2026-10-29) reuses this exact shape wholesale** —
`materials_disk` instead of `sounds_disk`, `StudyMaterial::resolvedFileUrl()` instead of
`Sound::resolvedUrl()`, both reading the same `supabase_public_url_base` config key (renamed from
`sounds_public_url_base` when this second caller showed up — one Supabase project, one public-URL
base, no reason for a second env var under a different name). No B2-era detour this time around;
the Supabase-specific lesson above was already learned.

## Automated tests — three gotchas specific to this stack

All six domains have a PHPUnit suite (`tests/Feature/{Domain}`), 106 tests, running against in-memory SQLite (already configured in `phpunit.xml` by default) rather than the MySQL dev database — fast, and it never touches real dev data. Three things cost real debugging time writing it, worth knowing before hitting them again:

- **`wasRecentlyCreated` controls `201` vs `200`, not an explicit status code anywhere in our controllers.** `Illuminate\Http\Resources\Json\ResourceResponse` checks the underlying model's `wasRecentlyCreated` flag and returns `201` automatically when it's `true` — meaning any endpoint that calls `Model::create()` or a genuinely-creating `firstOrCreate()` returns `201` with zero code written for it. Assumed otherwise twice while writing tests (`StudyMaterialTest`, then `FlashcardReviewTest`'s first-ever review) and was wrong both times — a test asserting the status code is what actually caught it.
- **A resolved auth guard caches its user for the rest of the test process.** `actingAs()`/a Bearer token both resolve through `Auth::guard()->setUser(...)`-style caching, and Laravel's test HTTP calls reuse one application container across every call within a single test *method* — unlike real sequential HTTP requests, which are independent. 

Two different auth contexts (e.g. "admin suspends a user, then that user's own token should now fail") chained in one method silently returns the *first* resolved user on the second call, regardless of what the second request's own token says. Caught by dumping the actual response body, not trusting the status-code assertion alone — the "failure" was a 200 carrying the wrong user's data. Fix: one auth context per test method; test the triggering action's effect via a direct DB assertion, and test the *consequence* (token now rejected) as its own method starting clean.
- **A factory state resolves before `create()`'s own overrides are merged in, not after.** `StudySessionFactory::completed()` derives `actual_minutes` from `$attributes['planned_minutes']` — but when a test calls `StudySession::factory()->completed()->create(['planned_minutes' => 25, ...])`, that `25` isn't visible to `completed()` yet; the state closure only ever sees the *randomized* `planned_minutes` from `definition()`, and the `create()`-time override is layered on top afterward. Writing `GetStudyActivityOverTimeAction`'s test this way produced a session with the right `planned_minutes` column but a random `actual_minutes` (summed to 180 instead of the expected 75) — caught by the test's own assertion, not a silent bug. Fix: when a state derives one field from another, don't override the *source* field at `create()` time and expect the state to re-derive from it — set the *derived* field directly in the override instead (`'actual_minutes' => 25`), bypassing the state's computation entirely.

The Postman collection + walkthrough in `docs/postman/` reproduces the same scenarios by hand against a real running server — worth running through once, since it exercises actual sequential HTTP requests the way a real client would, which is exactly the case the second gotcha above doesn't occur in.

## Rollout & what we skipped

Applying this to what already exists means: move `User.php` into `Domain/Users/Models/`, update `config/auth.php`'s model reference, split `routes/api.php` as shown, and write each domain's first Controller/Action pair as we build it — migrations don't need to move, they're infrastructure either way.

Deliberately **not** doing, and why:
- **Repository interfaces over Eloquent** — no second data store to abstract for; would add a layer of indirection with no current payoff.
- **Aggregate roots / value objects everywhere** — most of our entities don't have invariants complex enough to need enforcement beyond what a migration + a Form Request already give us.
- **CQRS (separate read/write models)** — our reads are mostly "list this domain's own table with a couple of filters"; a query builder call in the controller is enough, no separate read-model layer.
- **A DTO package** (e.g. `spatie/laravel-data`) — plain readonly PHP classes with constructor promotion cover this for now; worth revisiting only if the same shape keeps getting hand-rolled.

This is a structural decision, not a one-way door, but it's much cheaper to start this way than to migrate 12 tables' worth of controllers out of a flat structure later.
