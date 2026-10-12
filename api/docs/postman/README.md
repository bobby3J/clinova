# Testing the Clinova API in Postman

This folder has everything you need: a collection covering all 37 endpoints across all six domains, and two environments (`Admin` and `Student`) so you can switch who you're acting as with one dropdown click instead of re-pasting a token.

## 1. Import

In the Postman VS Code extension's sidebar: **Import** → select all three files in this folder (`Clinova.postman_collection.json`, `Clinova-Admin.postman_environment.json`, `Clinova-Student.postman_environment.json`). You'll end up with one collection and two environments.

## 2. Start the API and get real data to test against

```bash
cd api
php artisan serve
```

In a second terminal, reseed so you have predictable data (subject/topic/deck/sound #1 all exist, matching the collection's default variable values):

```bash
php artisan migrate:fresh --seed
```

## 3. Get tokens — this is the part that matters most

Every request in this collection authenticates with a **Bearer token**, not a real login. That's deliberate, not a shortcut taken out of laziness: Sanctum's `/login` uses cookie/session auth, which needs a CSRF-cookie handshake a REST client has to go out of its way to simulate (full mechanism explained in `ARCHITECTURE.md`'s "Sanctum SPA auth" section — worth reading once, since it's exactly what the React frontend will need to get right later). For exercising the API day-to-day, a Bearer token sidesteps all of that and is what we used for every curl verification this whole project.

Mint one for each role:

```bash
php artisan tinker --execute="
use App\Domain\Users\Models\User;
\$admin = User::where('email', 'admin@example.com')->first();
\$student = User::where('email', 'test@example.com')->first();
echo 'ADMIN: ' . \$admin->createToken('postman')->plainTextToken . PHP_EOL;
echo 'STUDENT: ' . \$student->createToken('postman')->plainTextToken . PHP_EOL;
"
```

Paste each into its matching environment's `token` variable (Postman's environment editor, not the request itself). Switch the active environment (top-right dropdown) to flip between "acting as admin" and "acting as student" for every request in the collection at once.

**First check**: with either environment active, run **Auth → Current User**. If it echoes back the right person, the token's wired correctly and everything downstream will work.

## 4. A walkthrough, not just a reference

The collection works as a reference (jump to any request), but running it in this order recreates — by hand, yourself — every behavior this backend was actually built and verified to do. Switch environments where noted.

1. **Auth → Current User** (Student) — confirms the token works.
2. **StudyLibrary → List Materials in a Topic** (Student) — note the count; some are published, some are seeded drafts you won't see yet.
3. Switch to **Admin**. **StudyLibrary → Create Study Material** → **Publish Material**. Check the response: `status: "draft"` on create, `"published"` after publish.
4. **Admin → Activity Log** — the publish you just did should already be sitting here. Nothing about StudyLibrary's code knows Admin exists; this is the event-driven loop from `ARCHITECTURE.md` actually running, not just described.
5. Switch back to **Student**. **StudyLibrary → List Materials in a Topic** again — the count should be one higher now.
6. **Flashcards → List Decks** (Student), then **Flashcards → Get Single Material**-style check: try **List Cards in a Deck** on a *draft* deck — expect a `403`. That's `FlashcardController`'s Policy check on the parent deck, not a bug.
7. Switch to **Admin**, publish that deck, switch back to **Student**, retry — now it works.
8. **Flashcards → Due Cards** (Student) — everything's due (no review history yet). **Review Card — quality 5**, then **Due Cards** again: that card just reviewed is gone from the list until its `next_review_at` arrives.
9. **StudySessions → Start Focus Session** (Student), then **Auth → Current User** — note `streak_count`. **Finish Session — exited early** — check `streak_count` again, unchanged. Start a new session, **Finish Session — completed** instead — `streak_count` goes up this time.
10. Switch to **Admin**. **Admin → Suspend User** (defaults to the seeded student, id 2). Switch to **Student**, try **Auth → Current User** — `401`, even though nothing about the token itself changed. That's `SuspendUserAction` revoking every existing token, not an expired-token coincidence.
11. **Admin → Reactivate User**, mint a *fresh* student token (the old one is gone for good), confirm login works again.
12. **Admin → Broadcast Announcement** — check the response's `recipient_count`.

If every step matches what's described, you've independently reproduced the same verification this whole backend went through — which is the actual point of doing this by hand once, rather than only trusting the automated test suite's word for it.

## 5. When something doesn't match

- **`401` where you expected success** → your environment's token is stale (suspended user, or you never pasted a fresh one) or the wrong environment is active.
- **`403` where you expected success** → check whether the resource is still `draft` (Student can't see/touch those) or whether the action needs `role:admin` and you're on the Student environment.
- **`422`** → read the response body; it's a validation message naming the exact field, not a generic failure.
- **`500` specifically on the `/login` request** → expected, see the note on that request in the collection — it's not wired for the cookie flow. Use Bearer tokens for everything else.
