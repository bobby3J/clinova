<?php

namespace App\Domain\AiPractice\Generators;

use App\Domain\AiPractice\Contracts\QuestionGenerator;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Support\Collection;

/**
 * The real, working implementation bound today (see AppServiceProvider)
 * while an LLM provider is still undecided — genuinely functional, not a
 * fake/broken placeholder, but deliberately **not** AI: a simple
 * fill-in-the-blank generator built from a material's own text, with no
 * external API call at all. Every question this produces says so in its
 * `explanation` field, so a student (or anyone reading the API response)
 * never mistakes this for real AI-generated practice.
 *
 * One question per *qualifying sentence*, not one per material — a single
 * material with enough body text can alone produce dozens of questions.
 * Still honest: it never invents content or repeats the same blank twice,
 * so a short material legitimately yields fewer questions than
 * $maxQuestions, rather than padding the count with duplicates.
 *
 * Swap point for later: bind a new class (e.g. AnthropicQuestionGenerator)
 * to QuestionGenerator::class instead of this one — GeneratePracticeSetAction
 * and everything downstream of it doesn't change at all.
 */
class TemplateQuestionGenerator implements QuestionGenerator
{
    public function generate(Topic $topic, Collection $materials, int $maxQuestions): array
    {
        $questions = collect();

        foreach ($materials as $material) {
            if ($questions->count() >= $maxQuestions) {
                break;
            }

            $remaining = $maxQuestions - $questions->count();
            $questions = $questions->merge($this->buildQuestionsForMaterial($material, $remaining));
        }

        return $questions->take($maxQuestions)->values()->all();
    }

    /** @return Collection<int, array> */
    private function buildQuestionsForMaterial(StudyMaterial $material, int $limit): Collection
    {
        $text = trim((string) $material->body);

        if ($text === '') {
            return collect([$this->buildTypeQuestion($material)]);
        }

        $sentences = collect(preg_split('/(?<=[.!?])\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [])
            ->filter(fn ($s) => str_word_count($s) >= 6)
            ->values();

        if ($sentences->isEmpty()) {
            return collect([$this->buildTypeQuestion($material)]);
        }

        $fullWordPool = collect(preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [])
            ->map(fn ($w) => trim($w, ".,;:!?\"'()"))
            ->filter(fn ($w) => strlen($w) >= 4);

        return $sentences
            ->take($limit)
            ->map(fn ($sentence) => $this->buildBlankQuestion($material, $sentence, $fullWordPool))
            ->filter()
            ->values();
    }

    private function buildBlankQuestion(StudyMaterial $material, string $sentence, Collection $fullWordPool): ?array
    {
        $words = preg_split('/\s+/', trim($sentence), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $candidateIndex = $this->longestWordIndex($words);

        if ($candidateIndex === null) {
            return null;
        }

        $answerWord = trim($words[$candidateIndex], ".,;:!?\"'()");
        $blanked = $words;
        $blanked[$candidateIndex] = '_____';

        $distractors = $fullWordPool
            ->filter(fn ($w) => strcasecmp($w, $answerWord) !== 0)
            ->unique()
            ->shuffle()
            ->take(3)
            ->values();

        $fillers = ['process', 'pattern', 'response', 'balance', 'system'];
        while ($distractors->count() < 3) {
            $distractors->push(array_shift($fillers) ?? 'option');
        }

        $options = $distractors->push($answerWord)->shuffle()->values();

        return [
            'question' => 'Fill in the blank (from "'.$material->title.'"): "'.implode(' ', $blanked).'"',
            'options' => $options->all(),
            'correct_option' => $options->search($answerWord),
            'explanation' => 'Template-generated, not AI — the full sentence reads: "'.$sentence.'"',
        ];
    }

    /** video/audio materials, or a note/tip with no usable body text. */
    private function buildTypeQuestion(StudyMaterial $material): array
    {
        $typeLabels = ['note' => 'Note', 'video' => 'Video', 'audio' => 'Audio', 'tip' => 'Exam Tip', 'slides' => 'Slide Deck'];
        $correctLabel = $typeLabels[$material->type->value] ?? ucfirst($material->type->value);
        $options = collect($typeLabels)->values()->shuffle();

        return [
            'question' => 'What type of resource is "'.$material->title.'"?',
            'options' => $options->all(),
            'correct_option' => $options->search($correctLabel),
            'explanation' => 'Template-generated, not AI — "'.$material->title.'" is a '.$correctLabel.' resource.',
        ];
    }

    private function longestWordIndex(array $words): ?int
    {
        $bestIndex = null;
        $bestLength = 0;
        foreach ($words as $i => $word) {
            $clean = trim($word, ".,;:!?\"'()");
            if (strlen($clean) > $bestLength && strlen($clean) >= 4) {
                $bestLength = strlen($clean);
                $bestIndex = $i;
            }
        }

        return $bestIndex;
    }
}
