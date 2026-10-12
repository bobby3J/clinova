import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { getSounds } from "../../lib/sounds";
import { getSettings } from "../../lib/settings";
import { getSessionHistory, startSession } from "../../lib/studySessions";
import { useStudySession } from "../../context/StudySessionContext";
import AmbientSounds from "./AmbientSounds";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import GradientBackdrop from "../../components/GradientBackdrop";
import MobileTopBar from "../../components/MobileTopBar";
import RecentSessionsList from "../../components/RecentSessionsList";
import {
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  HeadphonesIcon,
} from "../../components/icons";
import { ApiError } from "../../types/common";
import type { Sound } from "../../types/sounds";
import type { StudySession } from "../../types/studySessions";

type Tab = "focus" | "ambient" | "sessions";

/**
 * The mockup's 4th duration preset ("14 Hours," "Study challenge with
 * break") exceeds the backend's validated 5-180 minute range
 * (StartFocusSessionRequest) — swapped for a bounded Custom input rather
 * than shipping a card that would always fail validation.
 */
const DURATION_PRESETS = [
  { minutes: 25, label: "25 Minutes", desc: "Quick focus session" },
  { minutes: 50, label: "50 Minutes", desc: "Deep study session" },
  { minutes: 90, label: "90 Minutes", desc: "Extended focus" },
];

export default function SessionSetup() {
  const navigate = useNavigate();
  const { setSession } = useStudySession();

  const [activeTab, setActiveTab] = useState<Tab>("focus");
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [customMinutes, setCustomMinutes] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [selectedSoundId, setSelectedSoundId] = useState<number | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Session history is only needed for the "My Sessions" tab, but it's
    // cheap and fetching it upfront avoids a second loading state the
    // first time that tab is opened.
    getSessionHistory()
      .then((res) => setSessions(res.data))
      .catch(() => {
        // "My Sessions" just shows its own empty state — non-critical here.
      });

    Promise.all([getSounds(), getSettings()])
      .then(([soundsRes, settingsRes]) => {
        setSounds(soundsRes.data);

        // Pre-select the student's saved defaults instead of always
        // landing on 25 minutes/no sound. A preset match (25/50/90)
        // selects that card directly; anything else falls into Custom
        // with the saved value pre-filled, rather than silently snapping
        // to the nearest preset and losing what they actually saved.
        const { default_duration_minutes, default_sound_id } = settingsRes.data;
        const matchesPreset = DURATION_PRESETS.some(
          (p) => p.minutes === default_duration_minutes,
        );
        if (matchesPreset) {
          setSelectedMinutes(default_duration_minutes);
        } else {
          setUseCustom(true);
          setCustomMinutes(String(default_duration_minutes));
        }

        const savedSoundStillExists =
          default_sound_id !== null &&
          soundsRes.data.some((s) => s.id === default_sound_id);
        if (savedSoundStillExists) {
          setSelectedSoundId(default_sound_id);
        } else if (soundsRes.data.length > 0) {
          setSelectedSoundId(soundsRes.data[0].id);
        }
      })
      .catch(() => {
        // Sound picker just stays empty and duration stays at the 25-
        // minute fallback — a session can still start with no sound
        // (sound_id is optional server-side), and not loading saved
        // preferences isn't worth a blocking error state on this screen.
      });
  }, []);

  const NEW_SOUND_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
  const isRecentlyAdded = (sound: Sound) =>
    Date.now() - new Date(sound.created_at).getTime() < NEW_SOUND_WINDOW_MS;

  const soundNameById = useMemo(() => {
    const map = new Map<number, string>();
    sounds.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [sounds]);

  const plannedMinutes = useCustom ? Number(customMinutes) || 0 : selectedMinutes;
  const isValidDuration = plannedMinutes >= 5 && plannedMinutes <= 180;

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    if (!isValidDuration) {
      setError("Pick a duration between 5 and 180 minutes.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await startSession(plannedMinutes, selectedSoundId);
      const sound = sounds.find((s) => s.id === selectedSoundId) ?? null;
      setSession({
        sessionId: res.data.id,
        plannedMinutes,
        soundId: selectedSoundId,
        soundName: sound?.name ?? null,
        soundUrl: sound?.file_url ?? null,
        startedAt: res.data.started_at,
      });
      navigate("/study-with-me/active");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't start the session.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell background="bg-gray-50">
      <GradientBackdrop />
      <MobileTopBar />
      <div className="relative z-10 px-5 pt-6 pb-28 lg:px-0 lg:pt-0 lg:pb-0">
        <div className="mb-5 flex items-center gap-3">
          <Link to="/" className="text-gray-500">
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 lg:text-2xl">
            Study With Me
          </h1>
        </div>

        <div className="mb-6 flex gap-2">
          {(
            [
              ["focus", "Focus Timer"],
              ["ambient", "Ambient Sounds"],
              ["sessions", "My Sessions"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === tab
                  ? "bg-brand-500 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "ambient" && (
          <AmbientSounds sounds={sounds} isRecentlyAdded={isRecentlyAdded} />
        )}

        {activeTab === "sessions" && (
          <RecentSessionsList sessions={sessions} soundNameById={soundNameById} />
        )}

        {/* Mobile: duration, then sound, then button, all stacked.
            Desktop (lg:): duration is the main column, sound is a side
            rail, and the button spans both below — a real dashboard
            split, not just a wider stack. */}
        {activeTab === "focus" && (
        <form onSubmit={handleStart} className="lg:grid lg:grid-cols-3 lg:gap-8">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">
              Choose Your Session
            </h2>
            <div className="mb-6 flex flex-col gap-3 lg:mb-0">
              {DURATION_PRESETS.map((preset) => {
                const isSelected = !useCustom && selectedMinutes === preset.minutes;
                return (
                  <button
                    key={preset.minutes}
                    type="button"
                    onClick={() => {
                      setUseCustom(false);
                      setSelectedMinutes(preset.minutes);
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                      isSelected
                        ? "border-brand-400 bg-brand-50"
                        : "border-gray-100 bg-white"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        isSelected ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <ClockIcon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{preset.label}</p>
                      <p className="text-xs text-gray-400">{preset.desc}</p>
                    </span>
                    {isSelected && <CheckIcon className="h-5 w-5 text-brand-500" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setUseCustom(true)}
                className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                  useCustom ? "border-brand-400 bg-brand-50" : "border-gray-100 bg-white"
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    useCustom ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <ClockIcon className="h-4 w-4" />
                </span>
                <span className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">Custom</p>
                  <p className="text-xs text-gray-400">5–180 minutes</p>
                </span>
                {useCustom && (
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="min"
                    className="h-9 w-16 rounded-lg border border-gray-200 px-2 text-center text-sm"
                  />
                )}
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h2 className="mb-3 text-sm font-semibold text-gray-800">
              Choose Your Sound
            </h2>
            <div className="mb-6 grid grid-cols-2 gap-3 lg:mb-0 lg:grid-cols-1">
              {sounds.map((sound) => {
                const isSelected = selectedSoundId === sound.id;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => setSelectedSoundId(sound.id)}
                    className={`flex items-center gap-2 rounded-xl border p-3 text-left ${
                      isSelected ? "border-brand-400 bg-brand-50" : "border-gray-100 bg-white"
                    }`}
                  >
                    <HeadphonesIcon
                      className={`h-4 w-4 shrink-0 ${isSelected ? "text-brand-500" : "text-gray-400"}`}
                    />
                    <span className="truncate text-xs font-medium text-gray-700">
                      {sound.name}
                    </span>
                    {isRecentlyAdded(sound) && (
                      <span className="ml-auto shrink-0 rounded-full bg-success-100 px-1.5 py-0.5 text-[10px] font-semibold text-success-600">
                        New
                      </span>
                    )}
                  </button>
                );
              })}
              {sounds.length === 0 && (
                <p className="col-span-2 text-xs text-gray-400 lg:col-span-1">
                  No sounds available — you can still start without one.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-600 lg:col-span-3">
              {error}
            </div>
          )}

          <div className="lg:col-span-3 lg:mt-2 lg:flex lg:justify-center">
            <button
              type="submit"
              disabled={submitting || !isValidDuration}
              className="h-12 w-full rounded-xl bg-brand-500 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto lg:min-w-[280px] lg:px-16"
            >
              {submitting ? "Starting…" : "Start Session"}
            </button>
          </div>
        </form>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
