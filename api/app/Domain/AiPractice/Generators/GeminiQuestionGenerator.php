<?php

namespace App\Domain\AiPractice\Generators;

use App\Domain\AiPractice\Contracts\QuestionGenerator;
use App\Domain\StudyLibrary\Enums\MaterialType;
use App\Domain\StudyLibrary\Models\StudyMaterial;
use App\Domain\StudyLibrary\Models\Topic;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Throwable;

/**
 * The real AI-backed generator — calls Google's free-tier Gemini API,
 * grounded strictly in the topic's own published material text (never a
 * bare topic name) per this domain's content-source decision.
 *
 * Any failure (missing key, network error, rate limit, unparsable output)
 * falls back to TemplateQuestionGenerator rather than breaking the feature
 * outright — a real API call has real failure modes a free local generator
 * doesn't, and this is student-facing. The fallback's own "Template-
 * generated, not AI" explanation text makes a fallback visible if it
 * happens, rather than silently pretending to be AI output.
 */
class GeminiQuestionGenerator implements QuestionGenerator
{
    public function __construct(private TemplateQuestionGenerator $fallback)
    {
    }

    public function generate(Topic $topic, Collection $materials, int $maxQuestions): array
    {
        try {
            return $this->generateWithGemini($topic, $materials, $maxQuestions);
        } catch (Throwable $e) {
            Log::warning('Gemini question generation failed, falling back to template generator.', [
                'topic_id' => $topic->id,
                'error' => $e->getMessage(),
            ]);

            return $this->fallback->generate($topic, $materials, $maxQuestions);
        }
    }

    private function generateWithGemini(Topic $topic, Collection $materials, int $maxQuestions): array
    {
        $key = config('services.gemini.key');
        $model = config('services.gemini.model');

        if (! $key) {
            throw new RuntimeException('GEMINI_API_KEY is not configured.');
        }

        $parts = [
            ['text' => $this->buildPrompt($topic, $materials, $maxQuestions)],
            ...$this->buildSlideParts($materials),
        ];

        // 90s, not 60 — confirmed live that a text-only request comfortably
        // finishes well inside 60s, but a Slides-attached (PDF) request
        // genuinely takes longer server-side on Gemini's end and hit this
        // timeout exactly. Dockerfile's max_execution_time/nginx's
        // fastcgi_read_timeout are both 120s specifically to stay above
        // this with real headroom, not coincidentally close to it.
        $response = Http::timeout(90)
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$key}", [
                'contents' => [
                    ['parts' => $parts],
                ],
                'generationConfig' => [
                    'responseMimeType' => 'application/json',
                    'maxOutputTokens' => 8192,
                    'responseSchema' => [
                        'type' => 'ARRAY',
                        'items' => [
                            'type' => 'OBJECT',
                            'properties' => [
                                'question' => ['type' => 'STRING'],
                                'options' => ['type' => 'ARRAY', 'items' => ['type' => 'STRING']],
                                'correct_option' => ['type' => 'INTEGER'],
                                'explanation' => ['type' => 'STRING'],
                            ],
                            'required' => ['question', 'options', 'correct_option', 'explanation'],
                        ],
                    ],
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException("Gemini API request failed: HTTP {$response->status()} {$response->body()}");
        }

        $text = $response->json('candidates.0.content.parts.0.text');

        if (! $text) {
            throw new RuntimeException('Gemini API returned no content.');
        }

        $questions = json_decode($text, true);

        if (! is_array($questions)) {
            throw new RuntimeException('Gemini API returned unparsable question data.');
        }

        $valid = collect($questions)->filter(fn ($q) => $this->isValidQuestion($q))->values();

        if ($valid->isEmpty()) {
            throw new RuntimeException('Gemini API returned no valid questions.');
        }

        return $valid
            ->take($maxQuestions)
            ->map(fn (array $q) => [
                'question' => $q['question'],
                'options' => array_values($q['options']),
                'correct_option' => (int) $q['correct_option'],
                'explanation' => $q['explanation'],
            ])
            ->all();
    }

    /**
     * Gemini reads documents natively — layout, diagrams, charts included —
     * rather than this app extracting text from the PDF itself first, which
     * would lose exactly that content. Fetched via Storage directly (not a
     * re-fetch over the public URL): the app already holds S3 credentials,
     * so this is a normal authenticated read, not a second network hop
     * through Supabase's public endpoint.
     */
    private function buildSlideParts(Collection $materials): array
    {
        return $materials
            ->filter(fn (StudyMaterial $m) => $m->type === MaterialType::Slides && $m->file_path)
            ->map(function (StudyMaterial $m) {
                $bytes = Storage::disk(config('filesystems.materials_disk'))->get($m->file_path);

                return [
                    'inlineData' => [
                        'mimeType' => 'application/pdf',
                        'data' => base64_encode($bytes),
                    ],
                ];
            })
            ->values()
            ->all();
    }

    private function buildPrompt(Topic $topic, Collection $materials, int $maxQuestions): string
    {
        $content = $materials
            ->map(fn (StudyMaterial $material) => "## {$material->title}\n".strip_tags((string) $material->body))
            ->implode("\n\n");

        $slideTitles = $materials
            ->filter(fn (StudyMaterial $m) => $m->type === MaterialType::Slides)
            ->pluck('title');

        $slideNote = $slideTitles->isNotEmpty()
            ? "\n\nAlso use the attached slide deck document(s) as grounding material — titled: "
                .$slideTitles->implode(', ').'.'
            : '';

        return <<<PROMPT
            You are writing multiple-choice practice questions for nursing and midwifery
            students, based strictly on the study material below for the topic "{$topic->name}".

            Study material:
            {$content}{$slideNote}

            Generate up to {$maxQuestions} multiple-choice questions, thoroughly covering the
            material — ask multiple distinct questions about different facts, details, or
            paragraphs within the same material where it supports that, rather than one question
            per material. Each question must:
            - Be answerable directly from the material above — do not invent facts not present in it.
            - Be distinct from every other question — never repeat the same fact or near-duplicate wording.
            - Have exactly 4 options, plausible and mutually exclusive.
            - Have exactly one correct option, given as a 0-based index into the options array.
            - Include a short explanation (1-2 sentences) of why that option is correct, referencing the material.

            If the material does not contain enough distinct, grounded facts to support
            {$maxQuestions} non-repetitive questions, return fewer rather than inventing
            information or duplicating questions. Return only the questions as structured data,
            nothing else.
            PROMPT;
    }

    private function isValidQuestion(mixed $q): bool
    {
        return is_array($q)
            && ! empty($q['question'])
            && is_array($q['options'] ?? null)
            && count($q['options']) === 4
            && isset($q['correct_option'])
            && is_numeric($q['correct_option'])
            && (int) $q['correct_option'] >= 0
            && (int) $q['correct_option'] <= 3
            && ! empty($q['explanation']);
    }
}
