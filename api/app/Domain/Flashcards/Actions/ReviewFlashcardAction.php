<?php

namespace App\Domain\Flashcards\Actions;

use App\Domain\Flashcards\Enums\ProgressStatus;
use App\Domain\Flashcards\Models\Flashcard;
use App\Domain\Flashcards\Models\UserFlashcardProgress;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;

/**
 * Implements SM-2 (the SuperMemo-2 algorithm) — the same scheduling method
 * behind Anki and most spaced-repetition apps. This is the one piece of
 * real domain logic in this whole domain, which is exactly why it's an
 * Action and not a model method: it's a use case ("a student answered a
 * card"), not a simple field update.
 *
 * `quality` is the student's self-rated recall, 0-5:
 *   0-2 = failed to recall it at all → back to square one
 *   3-5 = recalled it, with increasing ease → interval grows
 *
 * No `repetitions` counter is stored — `interval_days` doubles as that
 * signal (0 = never reviewed, 1 = reviewed exactly once), which is why the
 * branches below key off it directly instead of a separate column.
 */
class ReviewFlashcardAction extends Action
{
    private const MIN_EASE_FACTOR = 1.3;

    private const MASTERED_AT_INTERVAL_DAYS = 21;

    public function handle(User $user, Flashcard $flashcard, int $quality): UserFlashcardProgress
    {
        // The second array is firstOrCreate()'s "attributes to use if
        // creating" — spelled out explicitly rather than left to the
        // columns' DB-level defaults. Same gotcha as the ContentStatus
        // issue in StudyMaterial/FlashcardDeck: on the row-doesn't-exist
        // path, Eloquent's create() returns an in-memory model that only
        // knows the attributes it was actually given — ease_factor and
        // interval_days would otherwise be null here, not 2.5/0, which
        // silently wrecks the very first review's math below.
        $progress = UserFlashcardProgress::firstOrCreate(
            ['user_id' => $user->id, 'flashcard_id' => $flashcard->id],
            [
                'status' => ProgressStatus::New,
                'ease_factor' => 2.5,
                'interval_days' => 0,
            ]
        );

        $easeFactor = (float) $progress->ease_factor;

        if ($quality < 3) {
            // Failed recall: SM-2 resets the interval to 1 day regardless
            // of history, but deliberately does NOT punish the ease factor
            // — one bad day on an otherwise-easy card shouldn't tank its
            // long-term scheduling.
            $intervalDays = 1;
        } else {
            $intervalDays = match (true) {
                $progress->interval_days === 0 => 1,   // first successful review ever
                $progress->interval_days === 1 => 6,   // second successful review
                default => (int) round($progress->interval_days * $easeFactor),
            };

            // The SM-2 ease-factor update formula — a passing grade (5)
            // nudges EF up slightly, a bare pass (3) nudges it down;
            // floored at 1.3 so a struggling card never schedules so
            // aggressively it's reviewed every single day forever.
            $easeFactor = max(
                self::MIN_EASE_FACTOR,
                $easeFactor + (0.1 - (5 - $quality) * (0.08 + (5 - $quality) * 0.02))
            );
        }

        $progress->update([
            'status' => $this->statusFor($quality, $intervalDays),
            'ease_factor' => round($easeFactor, 2),
            'interval_days' => $intervalDays,
            'last_reviewed_at' => now(),
            'next_review_at' => now()->addDays($intervalDays),
        ]);

        return $progress;
    }

    private function statusFor(int $quality, int $intervalDays): ProgressStatus
    {
        return match (true) {
            $quality < 3 => ProgressStatus::Learning,
            $intervalDays >= self::MASTERED_AT_INTERVAL_DAYS => ProgressStatus::Mastered,
            default => ProgressStatus::Learning,
        };
    }
}
