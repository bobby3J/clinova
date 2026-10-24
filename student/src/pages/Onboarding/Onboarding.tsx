import { useState } from "react";
import { useNavigate } from "react-router";
import GradientBackdrop from "../../components/GradientBackdrop";

/**
 * The mockup's 8th screen — deferred by the user's own instruction until
 * "the app is done" (see PROJECT_STARTING_POINT.md §"Rollout"), built now
 * that every other tile is real. Every slide after the first describes a
 * feature that actually exists and works today (Study With Me's timer +
 * ambient sounds, AI Practice + Flashcards, Progress tracking) — nothing
 * here is aspirational copy for a feature that isn't built yet.
 *
 * Each slide's `image` is a real illustration, not a simple line icon —
 * sourced from unDraw (MIT-licensed, no attribution required — see the
 * `undraw-svg` npm package used one-off to extract these four, then
 * removed again since the app doesn't need the other ~1,880 of them as a
 * dependency) and recolored from unDraw's default ink/accent hex to
 * Clinova's brand teal (#0E7C6B) by swapping just that one hex per file —
 * skin tones and neutral grays were left untouched so recoloring reads as
 * "on-brand," not as a broken illustration. No AI image generation was
 * available in this environment to produce bespoke art instead.
 *
 * A post-signup welcome tour, not a pre-auth gate — SignUp.tsx navigates
 * here (replace: true) immediately after a successful *registration*
 * only; signing in never does. This route lives inside AuthGate (see
 * App.tsx), so it requires a real session the same as every other screen
 * in the app — by the time anyone sees this, they're already logged in,
 * which is why "Start studying" below just goes to "/" rather than to
 * sign-up/sign-in the way an earlier pre-auth version of this screen did.
 *
 * No "has this been seen before" flag of any kind — an earlier version
 * used a localStorage marker to stop a browser-back replay, but that same
 * flag also silently suppressed onboarding for genuinely new accounts
 * sharing a browser that had ever reached /signin under an even earlier
 * (pre-auth-gate) version of this screen, which is a worse failure mode
 * than the mild redundancy of occasionally seeing the carousel twice.
 * /welcome has exactly one entry point in this whole app — SignUp.tsx's
 * post-registration navigate() above — so there's no real risk of this
 * showing up unexpectedly for a returning user through normal navigation.
 */
type Slide = {
  image: string;
  title: string;
  description: string;
};

const SLIDES: Slide[] = [
  {
    image: "/images/onboarding/studying.svg",
    title: "Clinova",
    description: "Your Nursing & Midwifery Study Companion",
  },
  {
    image: "/images/onboarding/focused.svg",
    title: "Study With Me",
    description:
      "A focus timer built for real study sessions, with ambient sounds — rain, white noise, or anything else your lecturers share — playing quietly in the background.",
  },
  {
    image: "/images/onboarding/quiz.svg",
    title: "AI Practice & Flashcards",
    description:
      "Practice questions generated from your actual course material, plus spaced-repetition flashcards your lecturers publish — reviewed, not just reread.",
  },
  {
    image: "/images/onboarding/growth-chart.svg",
    title: "Track Your Progress",
    description:
      "Study streaks, total time, and a weekly goal that's actually yours — see what you're building, session by session.",
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  function finish() {
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell relative flex min-h-screen flex-col overflow-hidden px-6 py-8">
      <GradientBackdrop />

      <div className="relative z-10 flex justify-end">
        {!isLast && (
          <button
            type="button"
            onClick={finish}
            className="text-sm font-medium text-gray-400"
          >
            Skip
          </button>
        )}
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center">
        <img
          src={slide.image}
          alt=""
          className="mb-6 h-56 w-full max-w-xs object-contain"
        />

        <h1 className="text-2xl font-bold text-gray-800">{slide.title}</h1>
        <p className="mx-auto mt-3 max-w-xs text-sm text-gray-500">
          {slide.description}
        </p>
      </div>

      <div className="relative z-10 mb-6 flex items-center justify-center gap-2">
        {SLIDES.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === index ? "w-6 bg-brand-500" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col gap-3">
        {isLast ? (
          <button
            type="button"
            onClick={finish}
            className="h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Start studying
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="h-12 rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
