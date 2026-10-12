<?php

namespace App\Domain\AiPractice\Contracts;

use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Support\Collection;

/**
 * The one seam this whole domain is built around — GeneratePracticeSetAction
 * depends on this interface, never on a concrete generator directly.
 * Swapping the bound implementation (see AppServiceProvider::register())
 * from TemplateQuestionGenerator to a real LLM-backed one later is the
 * entire integration; nothing else in this domain needs to change.
 */
interface QuestionGenerator
{
    /**
     * @param  Collection<int, \App\Domain\StudyLibrary\Models\StudyMaterial>  $materials
     *         The topic's published materials — already filtered to what a
     *         student is allowed to see, not raw/unfiltered content.
     * @param  int  $maxQuestions  Upper bound on how many questions to return.
     *         Implementations may legitimately return fewer — e.g. if the
     *         material doesn't contain enough distinct, grounded facts to
     *         support that many non-repetitive questions — but must never
     *         invent content or duplicate a question to pad the count up.
     * @return array<int, array{question: string, options: array<int, string>, correct_option: int, explanation: ?string}>
     */
    public function generate(Topic $topic, Collection $materials, int $maxQuestions): array;
}
