import { useEffect, useMemo, useRef, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import SoundFormModal from "./SoundFormModal";
import {
  activateSound,
  deactivateSound,
  getSounds,
} from "../../lib/soundLibrary";
import { AudioIcon, PencilIcon, PlusIcon } from "../../icons";
import { ApiError } from "../../types/common";
import type { Sound } from "../../types/soundLibrary";

type FormMode = { mode: "create" } | { mode: "edit"; sound: Sound };
type StatusFilter = "all" | "active" | "inactive";

export default function SoundLibrary() {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // One shared <audio> element rather than one per card — only one sound
  // should ever play at a time, and reusing a single element means
  // switching sounds doesn't leave the previous one's audio still loaded.
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getSounds()
      .then((res) => {
        if (!cancelled) setSounds(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load the sound library. Check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const categories = useMemo(
    () => Array.from(new Set(sounds.map((s) => s.category))).sort(),
    [sounds],
  );

  const visibleSounds = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sounds.filter((sound) => {
      if (categoryFilter !== "all" && sound.category !== categoryFilter) {
        return false;
      }
      if (statusFilter === "active" && !sound.is_active) return false;
      if (statusFilter === "inactive" && sound.is_active) return false;
      if (query && !sound.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [sounds, categoryFilter, statusFilter, search]);

  const activeCount = sounds.filter((s) => s.is_active).length;

  function handleSaved(saved: Sound) {
    setFormMode(null);
    setSounds((prev) => {
      const exists = prev.some((s) => s.id === saved.id);
      return exists
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [...prev, saved];
    });
  }

  function handleTogglePlay(sound: Sound) {
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === sound.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.src = sound.file_url;
    audio.play().catch(() => {
      setActionError(`Couldn't play "${sound.name}" — the file may be unreachable.`);
      setPlayingId(null);
    });
    setPlayingId(sound.id);
  }

  async function handleToggleActive(sound: Sound) {
    setActionError(null);
    setTogglingId(sound.id);
    try {
      const res = sound.is_active
        ? await deactivateSound(sound.id)
        : await activateSound(sound.id);
      setSounds((prev) =>
        prev.map((s) => (s.id === sound.id ? res.data : s)),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't update this sound.",
      );
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <>
      <PageMeta
        title="Sound Library | Clinova Admin"
        description="Manage ambient sounds for the Study-With-Me focus timer."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Sound Library
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Ambient sounds for the Study-With-Me focus timer. Paste a URL or
            upload a file directly.
          </p>
        </div>
        <Button
          onClick={() => setFormMode({ mode: "create" })}
          className="shrink-0 self-start sm:self-center"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New Sound
        </Button>
      </div>

      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
          {actionError}
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="shrink-0 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatTile label="Total sounds" value={sounds.length} />
        <StatTile label="Active" value={activeCount} />
        <StatTile label="Categories" value={categories.length} />
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            active={categoryFilter === "all"}
            onClick={() => setCategoryFilter("all")}
          />
          {categories.map((c) => (
            <FilterPill
              key={c}
              label={c}
              active={categoryFilter === c}
              onClick={() => setCategoryFilter(c)}
            />
          ))}
          <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-gray-700" />
          <FilterPill
            label="Active"
            active={statusFilter === "active"}
            onClick={() =>
              setStatusFilter((prev) => (prev === "active" ? "all" : "active"))
            }
          />
          <FilterPill
            label="Inactive"
            active={statusFilter === "inactive"}
            onClick={() =>
              setStatusFilter((prev) =>
                prev === "inactive" ? "all" : "inactive",
              )
            }
          />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sounds…"
          className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 sm:w-56"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-error-200 p-5 dark:border-error-500/30">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Try again
          </button>
        </div>
      ) : visibleSounds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {sounds.length === 0
              ? "No sounds yet"
              : "No sounds match your filters"}
          </p>
          <p className="text-xs text-gray-400">
            {sounds.length === 0
              ? 'Use "New Sound" above to add one.'
              : "Try a different category, status, or search term."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleSounds.map((sound) => (
            <div
              key={sound.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    sound.is_active
                      ? "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400"
                      : "bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-gray-500"
                  }`}
                >
                  <AudioIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800 dark:text-white/90">
                    {sound.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge size="sm" color="light">
                      {sound.category}
                    </Badge>
                    <Badge
                      size="sm"
                      color={sound.is_active ? "success" : "light"}
                    >
                      {sound.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(sound)}
                    aria-label={playingId === sound.id ? "Pause" : "Play"}
                    title={playingId === sound.id ? "Pause" : "Play"}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                      playingId === sound.id
                        ? "bg-brand-500 text-white hover:bg-brand-600"
                        : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    }`}
                  >
                    {playingId === sound.id ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode({ mode: "edit", sound })}
                    aria-label="Edit sound"
                    title="Edit sound"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {(sound.source || sound.license) && (
                <p className="mt-3 truncate text-xs text-gray-400">
                  {[sound.source, sound.license].filter(Boolean).join(" · ")}
                </p>
              )}

              <button
                type="button"
                disabled={togglingId === sound.id}
                onClick={() => handleToggleActive(sound)}
                className={`mt-3 w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  sound.is_active
                    ? "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
                    : "border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
                }`}
              >
                {togglingId === sound.id
                  ? "Saving…"
                  : sound.is_active
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </div>
          ))}
        </div>
      )}

      {formMode && (
        <SoundFormModal
          sound={formMode.mode === "edit" ? formMode.sound : null}
          onClose={() => setFormMode(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}

// No play/pause icons in the shared src/icons set — these are simple and
// one-off enough that adding new shared icon files for them felt like
// more ceremony than it's worth, same call already made for the small
// inline SVGs in AppHeader.tsx/UserDropdown.tsx.
function PlayIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5a.5.5 0 0 1 .77-.42l9 5.5a.5.5 0 0 1 0 .84l-9 5.5A.5.5 0 0 1 4 13.5v-11Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
      <path d="M4 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-11Zm5 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-11Z" />
    </svg>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
