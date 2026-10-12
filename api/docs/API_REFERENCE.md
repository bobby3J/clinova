# Clinova API Reference — for frontend integration

Every endpoint across all six built domains, with exact request/response shapes pulled directly from the current Form Requests and Resources (not from memory) on 2026-10-02. If this doc and the code ever disagree, the code wins — but they shouldn't, since nothing here is guessed.


`AiPractice` isn't in this doc — that domain doesn't exist yet.

## 1. Base URL

```
http://127.0.0.1:8000/api 
```

Whatever port `php artisan serve` actually prints. Put this behind a `VITE_API_URL` env var on the frontend, don't hardcode it — it'll differ between your machine, a teammate's, and production.

## 2. Authentication — read this before writing the login screen

The API supports two auth methods. **The frontend uses the first one; the second is a testing shortcut, not something to build the app around.**

### Method A — Session/cookie auth (what the real app uses)

This is Sanctum's "SPA" pattern: no token is ever stored in JS at all, the browser just carries a session cookie, the same way a traditional server-rendered site would. Full mechanism is in `ARCHITECTURE.md`'s "Sanctum SPA auth" section — the short version:

1. **Before the first login attempt**, `GET /sanctum/csrf-cookie` (note: no `/api` prefix on this one). This sets an `XSRF-TOKEN` cookie.
2. Every subsequent request echoes that cookie's value back as an `X-XSRF-TOKEN` header. Axios does this automatically if `withCredentials: true` is set and the cookie exists — you don't hand-roll this part.
3. `POST /api/login` with `{ email, password }`, credentials included. On success: `204 No Content`. The session cookie is now what authenticates every request after this — no token to store, nothing to attach manually.
4. `GET /api/user` confirms who's logged in. `401` means not authenticated.
5. `POST /api/logout` ends the session.

**Axios setup that makes this work:**

```ts

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,        // sends/receives the session + XSRF cookies
  withXSRFToken: true,          // axios 1.x: auto-attaches X-XSRF-TOKEN from the cookie
  headers: { Accept: 'application/json' },
});

// call once before the first login attempt
await api.get('/sanctum/csrf-cookie', { baseURL: import.meta.env.VITE_API_URL.replace('/api', '') });
```

**This is already configured** — `api/.env` now has:

```
FRONTEND_URL=http://localhost:5173
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

Two separate gates, both needed, both now set: `FRONTEND_URL` drives `config/cors.php`'s `allowed_origins` (the browser's CORS preflight check, which runs before Sanctum ever sees the request), and `SANCTUM_STATEFUL_DOMAINS` is Sanctum's own check for whether to treat a request as coming from a trusted session-auth frontend at all. `FRONTEND_URL` was previously a stale `localhost:3000` placeholder (a CRA-era default, not Vite's), which would have silently failed CORS the moment the real frontend tried to call the API — found and fixed while writing this doc, not left as a TODO. `SESSION_DOMAIN` is left at its default (`null`, meaning "use the current request's host") — correct as-is for a same-machine dev setup, no change needed.

If you ever see the exact "Session store not set on request" error from `ARCHITECTURE.md` while building the frontend, it means one of these two values has drifted from wherever Vite is actually running (a different port, a different machine) — check both, not just one.

### Method B — Bearer token (testing only, not for the app)

Every curl/Postman/PHPUnit verification this whole project used a Sanctum personal access token instead — simpler to script, nothing to do with how the real app should behave. Mint one via `php artisan tinker` (see `docs/postman/README.md`) if you want to poke at the API from a script without dealing with cookies. **Don't build the frontend's actual login flow around this** — there's no `POST /api/tokens` endpoint, and there isn't meant to be one.

### Suspended accounts

`422` from `/api/login` with a validation error on `email`: `"This account has been suspended."` — check for this specific message if the UI wants to show a distinct "contact support" state instead of a generic "wrong password" message.

## 3. Response & error conventions

Every successful response wraps its payload in `{ "data": ... }` (a Laravel API Resource). List endpoints: `{ "data": [...] }`. A few admin endpoints also add a `message` key alongside `data`.

| Status | Means | Body shape |
|---|---|---|
| `200` | Success (read, or a write where the row already existed) | `{ "data": ... }` |
| `201` | Success, and the row was just created | `{ "data": ... }` — **watch for this**: it's driven by Eloquent's `wasRecentlyCreated` flag, not something each endpoint decided individually. A flashcard review can return `201` (first-ever review) or `200` (reviewing again) for the *same endpoint*, depending on whether a progress row already existed. Don't branch frontend logic on this code; branch on the response body. |
| `204` | Success, empty body (login, logout) | — |
| `401` | Not authenticated — no valid session/token | `{ "message": "Unauthenticated." }` |
| `403` | Authenticated, but not allowed — wrong role, or Policy denial (e.g. a student viewing a draft) | `{ "message": "..." }` |
| `422` | Validation failed | `{ "message": "...", "errors": { "field": ["message"] } }` |
| `404` | Route-model-bound resource doesn't exist (e.g. `/materials/999`) | `{ "message": "..." }` |

No pagination exists anywhere yet — every index endpoint returns its full result set. Fine for current seed-scale data; will need addressing before this ships with real content volume. Don't build infinite-scroll/page-number UI against these yet, there's nothing for it to page through.

## 4. Enums (exact string values, used as-is in JSON)

| Enum | Values |
|---|---|
| `Track` | `nursing`, `midwifery` |
| `ContentStatus` | `draft`, `in_review`, `published` |
| `MaterialType` | `note`, `video`, `audio`, `tip` (added 2026-10-06 — lecturer-authored exam tips; text-based like `note`, not URL-based) |
| `ProgressStatus` | `new`, `learning`, `mastered` |
| `SessionType` | `focus`, `break` (every session created via the API is currently always `focus`) |

## 5. TypeScript types

Copy-paste starting point — matches the Resources exactly, including which fields are conditional.

```ts
export type Track = 'nursing' | 'midwifery';
export type ContentStatus = 'draft' | 'in_review' | 'published';
export type MaterialType = 'note' | 'video' | 'audio' | 'tip';
export type ProgressStatus = 'new' | 'learning' | 'mastered';
export type SessionType = 'focus' | 'break';

export interface User {
  id: number;
  name: string;
  email: string;
  track: Track | null;
  level: string | null;
  streak_count: number;
  weekly_goal_minutes: number;
  last_active_at: string | null;
  suspended_at: string | null;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: number;
  name: string;
  slug: string;
  track: Track;
  topics?: Topic[]; // present only when the backend eager-loads it
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  order: number;
  study_materials?: StudyMaterial[];
}

export interface StudyMaterial {
  id: number;
  topic_id: number;
  type: MaterialType;
  title: string;
  body: string | null;
  url: string | null;
  duration_minutes: number | null;
  status?: ContentStatus;   // admin only — key is absent for students, not null
  published_at?: string | null; // admin only
}

export interface FlashcardDeck {
  id: number;
  topic_id: number;
  title: string;
  description: string | null;
  card_count?: number;      // only on the decks index (withCount), absent elsewhere
  status?: ContentStatus;   // admin only
}

export interface Flashcard {
  id: number;
  deck_id: number;
  question: string;
  answer: string;
  order: number;
}

export interface FlashcardProgress {
  flashcard_id: number;
  status: ProgressStatus;
  ease_factor: number;      // always a JS number, backend converts from its internal decimal string
  interval_days: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}

export interface Sound {
  id: number;
  name: string;
  category: string;
  file_url: string;
  source?: string | null;   // admin only
  license?: string | null;  // admin only
  is_active?: boolean;      // admin only
}

export interface StudySession {
  id: number;
  sound_id: number | null;
  type: SessionType;
  planned_minutes: number;
  actual_minutes: number;
  completed: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface UserSettings {
  default_duration_minutes: number;
  default_sound_id: number | null;
  auto_breaks: boolean;
  notifications_enabled: boolean;
}

export interface AppNotification {
  id: string;
  title: string | null;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AiPracticeQuestion {
  id: number;
  question: string;
  options: string[];
  order: number;
  correct_option?: number;       // absent until this user has answered
  explanation?: string | null;   // absent until this user has answered
  my_selected_option?: number;   // absent until this user has answered
  my_answer_correct?: boolean;   // absent until this user has answered
}

export interface AiPracticeSet {
  id: number;
  topic_id: number;
  topic_name: string | null;
  created_at: string;
  questions: AiPracticeQuestion[];
}

export interface AiPracticeAnswer {
  question_id: number;
  selected_option: number;
  is_correct: boolean;
  correct_option: number;
  explanation: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
  track: Track | null;
  level: string | null;
  streak_count: number;
  is_suspended: boolean;
  created_at: string;
}

export interface AdminActivityLog {
  id: number;
  admin_name: string | null;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  description: string | null;
  created_at: string;
}

export interface ApiResponse<T> { data: T; }
export interface ApiListResponse<T> { data: T[]; }
export interface ApiValidationError {
  message: string;
  errors: Record<string, string[]>;
}

// What Resource::collection() produces automatically when handed a
// paginator (->paginate()) instead of a plain Collection (->get()) — as
// of 2026-10-05, this is GET /admin/users and GET /admin/activity-log.
// `links` carries first/last/prev/next URLs; `meta` carries the numbers
// a Previous/Next UI actually needs (current_page, last_page, total).
export interface ApiPaginatedResponse<T> {
  data: T[];
  links: { first: string | null; last: string | null; prev: string | null; next: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
}
```

---

## 6. Endpoints

### Auth (`Domain/Users`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/register` | guest only | |
| POST | `/login` | guest only | Session auth — see §2 |
| POST | `/logout` | authenticated | |
| GET | `/user` | authenticated | Returns the raw `User` model, not a Resource — slightly different shape than other endpoints, includes every column |
| POST | `/forgot-password` | guest only | |
| POST | `/reset-password` | guest only | |
| POST | `/email/verification-notification` | authenticated | Resends the verification email |
| GET | `/verify-email/{id}/{hash}` | authenticated, signed URL | Not something you call directly — it's the link inside the verification email |
| PUT | `/user/password` | authenticated | Change your own password — `current_password`/`password`/`password_confirmation`. Was missing from this doc until 2026-10-06 despite existing since the admin Settings pass; added while touching this section for the notifications rows below |
| GET | `/notifications` | authenticated | `{ "data": [{ "id": string, "title": string\|null, "body": string\|null, "read_at": string\|null, "created_at": string }], "meta": { "unread_count": number } }` — the caller's own rows only, newest first, capped at 50. Reads Laravel's built-in notifications table (no new table); today the only writer is `BroadcastAnnouncementAction` |
| POST | `/notifications/mark-all-read` | authenticated | `204` — marks every unread notification read in one query. No per-notification read endpoint exists (no per-item UI to back it yet) |
| GET | `/user/settings` | authenticated | `{ "data": { "default_duration_minutes": number, "default_sound_id": number\|null, "auto_breaks": boolean, "notifications_enabled": boolean } }` — lazily creates a defaults row on first call (`default_duration_minutes: 25, auto_breaks: true, notifications_enabled: true`) if one doesn't exist yet. Always `200`, even on that first lazy-create — not `201` |
| PUT | `/user/settings` | authenticated | Same shape as GET. Partial update — every field `sometimes` |

**PUT `/user/settings`**
```json
{ "default_duration_minutes": "integer, optional, 5-180 (same bounds as POST /study-sessions)",
  "default_sound_id": "integer, optional, nullable, must exist in sounds",
  "auto_breaks": "boolean, optional", "notifications_enabled": "boolean, optional" }
```

**POST `/register`**
```json
// request
{ "name": "string, required, max:255",
  "email": "string, required, email, max:255, unique",
  "password": "required, confirmed",
  "password_confirmation": "required" }
// 204 No Content on success, user is logged in immediately
```

**POST `/login`**
```json
// request
{ "email": "required, email", "password": "required" }
// 204 No Content on success
// 422 { "errors": { "email": ["These credentials do not match our records."] } } — wrong password
// 422 { "errors": { "email": ["This account has been suspended."] } } — suspended account
```

**GET `/user`**
```json
{ "id": 2, "name": "Test Student", "email": "test@example.com",
  "track": null, "level": null, "streak_count": 0, "weekly_goal_minutes": 300,
  "last_active_at": null, "suspended_at": null,
  "email_verified_at": "2026-...", "created_at": "2026-...", "updated_at": "2026-..." }
```

---

### StudyLibrary

All routes under `/study-library`, all require authentication. Admin-only routes additionally require the `admin` or `lecturer` role (as of 2026-10-06 — lecturers get full parity with admin on this domain, see `User::canManageStudyContent()`). "admin" in the Auth column below means "admin or lecturer" throughout this section, not admin-exclusively.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/subjects` | any | `ApiListResponse<Subject>` |
| POST | `/subjects` | admin | `ApiResponse<Subject>` |
| PATCH | `/subjects/{subject}` | admin | `ApiResponse<Subject>` |
| DELETE | `/subjects/{subject}` | admin | `204` — also writes an Admin activity-log entry (`deleted_subject`, added 2026-10-05). Cascades to the subject's topics and their materials at the DB level |
| GET | `/topics` | any | `ApiListResponse<Topic>` |
| POST | `/topics` | admin | `ApiResponse<Topic>` |
| PATCH | `/topics/{topic}` | admin | `ApiResponse<Topic>` |
| DELETE | `/topics/{topic}` | admin | `204` — also writes an Admin activity-log entry (`deleted_topic`, added 2026-10-05). Cascades to the topic's materials at the DB level |
| GET | `/topics/{topic}/materials` | any | `ApiListResponse<StudyMaterial>` — students see published only |
| GET | `/materials/{studyMaterial}` | any | `ApiResponse<StudyMaterial>` — `403` if draft and not admin |
| POST | `/materials` | admin | `ApiResponse<StudyMaterial>` |
| PATCH | `/materials/{studyMaterial}` | admin | `ApiResponse<StudyMaterial>` |
| POST | `/materials/{studyMaterial}/publish` | admin | `ApiResponse<StudyMaterial>` — also writes an Admin activity-log entry |
| DELETE | `/materials/{studyMaterial}` | admin | `204` |

**POST `/subjects`**
```json
{ "name": "string, required, max:255", "track": "nursing | midwifery, required" }
```

**POST `/topics`**
```json
{ "subject_id": "integer, required, must exist", "name": "string, required, max:255", "order": "integer, optional, min:0" }
```

**POST `/materials`** — `type` decides which of `body`/`url` is required:
```json
{
  "topic_id": "integer, required, must exist",
  "type": "note | video | audio | tip, required",
  "title": "string, required, max:255",
  "body": "required if type=note or tip, otherwise ignored",
  "url": "required if type=video or audio, must be a valid URL",
  "duration_minutes": "integer, optional, 1-600 — relevant for video/audio"
}
```
New materials are always created `status: draft` regardless of role. Note
and Tip are both text-based (`body`, no `url`); Video and Audio are both
URL-based (`url`, no `body`) — this used to be phrased as "note vs.
everything else" before Tip existed, which is why it's spelled out
explicitly here now rather than as one type's inverse.

**PATCH `/materials/{id}`** — every field optional (`sometimes`), send only what's changing:
```json
{ "title": "string, max:255", "body": "string|null", "url": "string|null", "duration_minutes": "integer|null" }
```

---

### Flashcards

All routes under `/flashcards`, all require authentication. Same role note as StudyLibrary above: "admin" in the Auth column means "admin or lecturer" as of 2026-10-06.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/decks` | any | `ApiListResponse<FlashcardDeck>` — students see published only, each deck includes `card_count` |
| POST | `/decks` | admin | `ApiResponse<FlashcardDeck>` |
| PATCH | `/decks/{flashcardDeck}` | admin | `ApiResponse<FlashcardDeck>` |
| DELETE | `/decks/{flashcardDeck}` | admin | `204` — also writes an Admin activity-log entry (`deleted_flashcard_deck`, added 2026-10-05). Cascades to the deck's cards at the DB level |
| POST | `/decks/{deck}/publish` | admin | `ApiResponse<FlashcardDeck>` — also writes an Admin activity-log entry. No `published_at` field exists on this model, unlike StudyMaterial |
| GET | `/decks/{deck}/cards` | any | `ApiListResponse<Flashcard>` — `403` if the deck is draft and caller isn't admin |
| POST | `/cards` | admin | `ApiResponse<Flashcard>` |
| PATCH | `/cards/{flashcard}` | admin | `ApiResponse<Flashcard>` |
| DELETE | `/cards/{flashcard}` | admin | `204` — also writes an Admin activity-log entry (`deleted_flashcard`, added 2026-10-05) |
| GET | `/due` | any | `ApiListResponse<Flashcard>` — cards due for *the calling user*, published decks only |
| POST | `/{flashcard}/review` | any, but only if the card's deck is published | `ApiResponse<FlashcardProgress>` |

**POST `/decks`**
```json
{ "topic_id": "integer, required, must exist", "title": "string, required, max:255", "description": "string, optional, max:1000" }
```

**POST `/cards`**
```json
{ "deck_id": "integer, required, must exist", "question": "string, required", "answer": "string, required", "order": "integer, optional" }
```
Authorization here checks the *deck's* `update` ability, not a Flashcard-level permission — a `403` on this endpoint means "you can't edit that deck," same rule as publishing it.

**POST `/{flashcard}/review`** — the SM-2 endpoint:
```json
// request
{ "quality": "integer, required, 0-5" }
// response
{ "data": { "flashcard_id": 6, "status": "learning", "ease_factor": 2.6, "interval_days": 1,
            "last_reviewed_at": "2026-...", "next_review_at": "2026-..." } }
```
`quality` 0-2 = failed recall (interval resets to 1 day, ease factor untouched). 3-5 = success, interval grows. First-ever review of a card returns `201`; reviewing one with existing progress returns `200`.

---

### SoundLibrary

All routes under `/sounds`, all require authentication.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/` | any | `ApiListResponse<Sound>` — students see active only, and never see `source`/`license`/`is_active` |
| POST | `/` | admin | `ApiResponse<Sound>` |
| PATCH | `/{sound}/deactivate` | admin | `ApiResponse<Sound>` |
| PATCH | `/{sound}/activate` | admin | `ApiResponse<Sound>` |

**POST `/`**
```json
{ "name": "string, required, max:255", "category": "string, required, max:100",
  "file_url": "required, valid URL, max:2048",
  "source": "string, optional, max:255", "license": "string, optional, max:100" }
```
No real file-upload endpoint exists — `file_url` must already point somewhere real. New sounds are always `is_active: true`.

---

### StudySessions

All routes under `/study-sessions`, all require authentication. No admin routes at all in this domain — every route is gated by ownership (a student can only ever touch their own sessions), not role.

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/` | any | `ApiListResponse<StudySession>` — only the caller's own sessions |
| POST | `/` | any | `ApiResponse<StudySession>` — starts a session |
| PATCH | `/{studySession}/finish` | owner only | `ApiResponse<StudySession>` — `403` if it's not your session |

**POST `/`**
```json
{ "planned_minutes": "integer, required, 5-180", "sound_id": "integer, optional, must exist" }
```
Always created `type: focus`, `completed: false`, `actual_minutes: 0`.

**PATCH `/{id}/finish`**
```json
{ "actual_minutes": "integer, required, min:0", "completed": "boolean, required" }
```
`completed: true` fires a streak update on the user (consecutive-day logic — see `ARCHITECTURE.md`). `completed: false` still saves the row (an honest record of an abandoned session) but does **not** touch the streak. Both outcomes return `200`/`201` the same way as everywhere else — check `completed` in the response, not the status code, to tell which branch happened.

---

### AiPractice

All routes under `/ai-practice`, all require authentication. No admin routes — same ownership-only shape as StudySessions, any authenticated user can generate practice for any published topic.

Question generation sits behind a `QuestionGenerator` interface (`app/Domain/AiPractice/Contracts/`) — as of 2026-10-08 the bound implementation is `TemplateQuestionGenerator`, a real, working, **non-AI** fill-in-the-blank generator built from a topic's own published material text (no external API call, no cost). The name "AiPractice" is the domain/feature name, not a claim about the current implementation — every generated question's `explanation` says "Template-generated, not AI" explicitly. Swapping to a real LLM-backed generator later is one new class plus a one-line change in `AppServiceProvider::register()` — see `ARCHITECTURE.md`.

| Method | Path | Returns |
|---|---|---|
| GET | `/sets` | `ApiListResponse<AiPracticeSet>` — the caller's own practice history, newest first, unpaginated (same "one student's own rows" shape as `GET /study-sessions`) |
| POST | `/sets` | `ApiResponse<AiPracticeSet>` — generates and persists a new set, up to 5 questions, from a topic's published materials |
| POST | `/questions/{question}/answer` | `ApiResponse<AiPracticeAnswer>` |

**POST `/sets`**
```json
{ "topic_id": "integer, required, must exist" }
// 422 { "errors": { "topic_id": ["This topic has no published study materials..."] } }
//   if the topic has zero published materials
```

**POST `/questions/{id}/answer`**
```json
{ "selected_option": "integer, required, 0-3" }
```
Append-only — answering the same question twice just adds a second `AiPracticeAnswer` row (same honest-log shape as `StudySession`), it doesn't overwrite the first attempt or reject the second one.

A question's `correct_option`/`explanation`/`my_selected_option`/`my_answer_correct` are **absent entirely** (not `null`) from `GET /sets` until the requesting student has actually answered that specific question — same `$this->when()` conditional-field convention `StudyMaterialResource` already uses for admin-only fields, gated on "have I answered this" instead of "am I an admin". `my_selected_option`/`my_answer_correct` reflect *this* student's own latest answer specifically (not just whether the question has been answered by anyone) — added after an early version of this Resource only exposed `correct_option`, which was enough to show the right answer but not enough to tell whether the student themselves got it right, which `Progress.tsx`'s practice-history score needed.

---

### Admin

All routes under `/admin`, require authentication **and** the `admin` role (strictly — unlike StudyLibrary/Flashcards, nothing here widens to `lecturer`) — a student *or lecturer* token gets `403` on every single one of these, enforced at the route level before any controller runs. See `LecturerBoundaryTest.php` for the regression coverage proving that holds.

| Method | Path | Returns |
|---|---|---|
| GET | `/users?page=&per_page=` | `ApiPaginatedResponse<AdminUser>` — students only, not other admins. Paginated as of 2026-10-05; default 25/page, `per_page` capped at 100 |
| PATCH | `/users/{user}/suspend` | `ApiResponse<AdminUser>` — also revokes every existing Sanctum token for that user |
| PATCH | `/users/{user}/reactivate` | `ApiResponse<AdminUser>` |
| GET | `/lecturers?page=&per_page=` | `ApiPaginatedResponse<AdminUser>` — lecturers only. Added 2026-10-06, same shape/pagination as `/users` |
| POST | `/lecturers` | `ApiResponse<AdminUser>` — creates a lecturer account directly (name/email/password); `email_verified_at` is set immediately since the admin creating it is already vouching for it. Also writes an Admin activity-log entry (`created_lecturer`) |
| PATCH | `/lecturers/{user}/suspend` | `ApiResponse<AdminUser>` — same `SuspendUserAction` `/users/{user}/suspend` uses, just reused against a lecturer account |
| PATCH | `/lecturers/{user}/reactivate` | `ApiResponse<AdminUser>` |
| POST | `/announcements` | `{ "data": { "recipient_count": number }, "message": "Announcement sent." }` |
| GET | `/activity-log?page=&per_page=` | `ApiPaginatedResponse<AdminActivityLog>` — paginated as of 2026-10-05; default 20/page, `per_page` capped at 100 |
| GET | `/analytics/overview` | `{ "data": { "active_students_7d": number, "study_hours_7d": number, "avg_session_minutes": number, "new_signups_7d": number } }` |
| GET | `/analytics/study-activity?days=` | `{ "data": [{ "date": "YYYY-MM-DD", "minutes": number, "sessions": number }, ...] }` — one entry per day, oldest first, zero-filled. `days` defaults to 30, capped at 90 |

**POST `/lecturers`**
```json
{ "name": "string, required, max:255", "email": "string, required, email, unique",
  "password": "string, required, confirmed, must meet Password::defaults()" }
```

**POST `/announcements`**
```json
{ "title": "string, required, max:255", "body": "string, required, max:2000",
  "track": "nursing | midwifery, optional — omit to broadcast to every student regardless of track",
  "level": "string, optional" }
```
Only ever reaches users with the `student` role — the broadcasting admin never receives their own announcement. Delivered via Laravel's built-in notifications table (`database` channel only for now, no email/push yet).

**PATCH `/users/{id}/suspend`**
Immediately revokes that user's existing tokens (they're logged out of any active session on next request) and blocks future logins with a `422` + the "This account has been suspended." message from §2. Doesn't need a request body.
