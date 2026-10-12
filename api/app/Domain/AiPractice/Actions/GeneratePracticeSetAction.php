<?php

namespace App\Domain\AiPractice\Actions;

use App\Domain\AiPractice\Contracts\QuestionGenerator;
use App\Domain\AiPractice\Models\AiPracticeSet;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use App\Domain\Users\Models\User;
use App\Support\Actions\Action;
use Illuminate\Validation\ValidationException;

/**
 * Depends on QuestionGenerator (the interface), never on a concrete
 * generator — see that interface's own docblock for why. Capped at 50
 * questions per set — generators are expected to produce up to that many
 * from a topic's material, not one-per-material (a topic can have as few
 * as one published material and still yield a full set).
 *
 * MAX_MATERIALS is a separate, much looser cap purely to bound how much
 * material text gets fed into a prompt/generator — it must never be set
 * to MAX_QUESTIONS (that was the bug: capping materials fetched by the
 * question count meant a topic with 2 materials could never produce more
 * than 2 questions, no matter what any generator did).
 */
class GeneratePracticeSetAction extends Action
{
    private const MAX_QUESTIONS = 50;

    private const MAX_MATERIALS = 30;

    public function __construct(private QuestionGenerator $generator) {}

    public function handle(User $user, Topic $topic): AiPracticeSet
    {
        $materials = StudyMaterial::query()
            ->where('topic_id', $topic->id)
            ->visibleToStudents()
            ->limit(self::MAX_MATERIALS)
            ->get();

        if ($materials->isEmpty()) {
            throw ValidationException::withMessages([
                'topic_id' => 'This topic has no published study materials to generate practice questions from yet.',
            ]);
        }

        $questions = collect($this->generator->generate($topic, $materials, self::MAX_QUESTIONS))
            ->take(self::MAX_QUESTIONS)
            ->all();

        $set = AiPracticeSet::create([
            'user_id' => $user->id,
            'topic_id' => $topic->id,
        ]);

        foreach ($questions as $order => $question) {
            $set->questions()->create([
                'question' => $question['question'],
                'options' => $question['options'],
                'correct_option' => $question['correct_option'],
                'explanation' => $question['explanation'] ?? null,
                'order' => $order,
            ]);
        }

        return $set->load('questions');
    }
}
