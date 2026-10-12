import { useEffect, useRef, useState } from "react";
import { HeadphonesIcon, PauseIcon, PlayIcon } from "../../components/icons";
import type { Sound } from "../../types/sounds";

/**
 * A sound-only player — no timer, no StudySession is created (this isn't
 * a focus session, just ambience). Reuses the same `sounds` list
 * SessionSetup already fetched rather than loading it again. Loops the
 * same way ActiveSession.tsx's focus-session audio does (single <audio>
 * element, src swapped per selection, `loop` on).
 */
export default function AmbientSounds({
  sounds,
  isRecentlyAdded,
}: {
  sounds: Sound[];
  isRecentlyAdded: (sound: Sound) => boolean;
}) {
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playing = sounds.find((s) => s.id === playingId) ?? null;

  useEffect(() => {
    if (!audioRef.current || !playing) return;
    audioRef.current.play().catch(() => {
      // Autoplay-blocked until a gesture — selecting a sound IS the
      // gesture here, so this only matters if a browser is unusually strict.
    });
  }, [playing]);

  function toggle(sound: Sound) {
    if (playingId === sound.id) {
      setPlayingId(null);
    } else {
      setPlayingId(sound.id);
    }
  }

  return (
    <div>
      {playing && <audio ref={audioRef} src={playing.file_url} loop />}

      <h2 className="mb-3 text-sm font-semibold text-gray-800">
        Pick a sound to play — no timer, just ambience
      </h2>

      {sounds.length === 0 ? (
        <p className="text-xs text-gray-400">No sounds available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {sounds.map((sound) => {
            const isPlaying = playingId === sound.id;
            return (
              <button
                key={sound.id}
                type="button"
                onClick={() => toggle(sound)}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                  isPlaying ? "border-brand-400 bg-brand-50" : "border-gray-100 bg-white"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isPlaying ? "bg-brand-500 text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {isPlaying ? (
                    <PauseIcon className="h-3.5 w-3.5" />
                  ) : (
                    <PlayIcon className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="flex-1 truncate text-xs font-medium text-gray-700">
                  {sound.name}
                </span>
                {isRecentlyAdded(sound) && (
                  <span className="shrink-0 rounded-full bg-success-100 px-1.5 py-0.5 text-[10px] font-semibold text-success-600">
                    New
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {playing && (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-gray-500">
          <HeadphonesIcon className="h-3.5 w-3.5 text-brand-500" />
          Now playing: {playing.name}
        </p>
      )}
    </div>
  );
}
