import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import DeckFormModal from "./DeckFormModal";
import DeckCardsModal from "./DeckCardsModal";
import { getSubjects, getTopics } from "../../lib/studyLibrary";
import { deleteDeck, getDecks, publishDeck } from "../../lib/flashcards";
import {
  CheckCircleIcon,
  CopyIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashBinIcon,
} from "../../icons";
import { ApiError, type ContentStatus, type Track } from "../../types/common";
import type { Subject, Topic } from "../../types/studyLibrary";
import type { FlashcardDeck } from "../../types/flashcards";

type FormMode = { mode: "create" } | { mode: "edit"; deck: FlashcardDeck };

const STATUS_BADGE: Record<
  ContentStatus,
  { label: string; color: "light" | "warning" | "success" }
> = {
  draft: { label: "Draft", color: "light" },
  in_review: { label: "In review", color: "warning" },
  published: { label: "Published", color: "success" },
};

const TRACK_LABEL: Record<Track, string> = {
  nursing: "Nursing",
  midwifery: "Midwifery",
};

/**
 * Subjects/Topics here are read-only — no add/edit/delete affordances.
 * That management already lives on the Study Library page, and Subject/
 * Topic are shared curriculum structure, not owned by this domain; this
 * page only needs a topic to browse decks under. Duplicating the taxonomy
 * CRUD here would just be a second place to maintain the same data.
 */
export default function Flashcards() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<
    Record<number, Topic[]>
  >({});
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeReloadToken, setTreeReloadToken] = useState(0);

  const [activeTrack, setActiveTrack] = useState<Track | "all">("all");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [decksError, setDecksError] = useState<string | null>(null);
  const [decksReloadToken, setDecksReloadToken] = useState(0);

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [cardsModalDeck, setCardsModalDeck] = useState<FlashcardDeck | null>(
    null,
  );
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTree() {
      setTreeLoading(true);
      setTreeError(null);
      try {
        const subjectsRes = await getSubjects();
        const subjectList = subjectsRes.data;
        const topicEntries = await Promise.all(
          subjectList.map(async (subject: Subject) => {
            const topicsRes = await getTopics(subject.id);
            return [subject.id, topicsRes.data] as const;
          }),
        );
        if (cancelled) return;
        setSubjects(subjectList);
        setTopicsBySubject(Object.fromEntries(topicEntries));
      } catch (err) {
        if (cancelled) return;
        setTreeError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load subjects and topics. Check your connection and try again.",
        );
      } finally {
        if (!cancelled) setTreeLoading(false);
      }
    }

    loadTree();
    return () => {
      cancelled = true;
    };
  }, [treeReloadToken]);

  useEffect(() => {
    if (selectedTopicId === null) {
      setDecks([]);
      setDecksError(null);
      return;
    }
    let cancelled = false;
    setDecksLoading(true);
    setDecksError(null);

    getDecks(selectedTopicId)
      .then((res) => {
        if (!cancelled) setDecks(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          setDecksError(
            err instanceof ApiError ? err.message : "Couldn't load decks for this topic.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDecksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTopicId, decksReloadToken]);

  const visibleSubjects = useMemo(
    () =>
      activeTrack === "all"
        ? subjects
        : subjects.filter((s) => s.track === activeTrack),
    [subjects, activeTrack],
  );

  const selectedTopicName = useMemo(() => {
    if (selectedTopicId === null) return null;
    for (const topics of Object.values(topicsBySubject)) {
      const match = topics.find((t) => t.id === selectedTopicId);
      if (match) return match.name;
    }
    return null;
  }, [topicsBySubject, selectedTopicId]);

  function handleSaved(saved: FlashcardDeck) {
    setFormMode(null);
    if (saved.topic_id === selectedTopicId) {
      setDecks((prev) => {
        const exists = prev.some((d) => d.id === saved.id);
        return exists
          ? prev.map((d) => (d.id === saved.id ? saved : d))
          : [...prev, saved];
      });
    } else {
      setSelectedTopicId(saved.topic_id);
    }
  }

  async function handlePublish(deck: FlashcardDeck) {
    setActionError(null);
    setPublishingId(deck.id);
    try {
      const res = await publishDeck(deck.id);
      setDecks((prev) => prev.map((d) => (d.id === deck.id ? res.data : d)));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't publish this deck.",
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDelete(deck: FlashcardDeck) {
    const cardWarning = deck.card_count
      ? ` and its ${deck.card_count} card${deck.card_count === 1 ? "" : "s"}`
      : "";
    if (
      !window.confirm(`Delete "${deck.title}"${cardWarning}? This can't be undone.`)
    ) {
      return;
    }
    setActionError(null);
    setDeletingId(deck.id);
    try {
      await deleteDeck(deck.id);
      setDecks((prev) => prev.filter((d) => d.id !== deck.id));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't delete this deck.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleCardCountChange(deckId: number, count: number) {
    setDecks((prev) =>
      prev.map((d) => (d.id === deckId ? { ...d, card_count: count } : d)),
    );
  }

  return (
    <>
      <PageMeta
        title="Flashcards | Clinova Admin"
        description="Manage flashcard decks and their cards."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Flashcards
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Decks and cards, scoped per topic. Same draft → published review
            workflow as Study Library.
          </p>
        </div>
        <Button
          onClick={() => setFormMode({ mode: "create" })}
          disabled={selectedTopicId === null}
          title={
            selectedTopicId === null
              ? "Select a topic first"
              : undefined
          }
          className="shrink-0 self-start disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New Deck
        </Button>
      </div>

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

      <div className="mb-6 inline-flex rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-white/[0.03]">
        {(["all", "nursing", "midwifery"] as const).map((track) => (
          <button
            key={track}
            type="button"
            onClick={() => {
              setActiveTrack(track);
              setSelectedTopicId(null);
            }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              activeTrack === track
                ? "bg-brand-500 text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
            }`}
          >
            {track === "all" ? "All tracks" : TRACK_LABEL[track]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Subjects & topics — read-only here; manage them on Study Library */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Topics
          </h2>

          {treeLoading ? (
            <div className="flex flex-col gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="mb-2 h-4 w-2/3 rounded bg-gray-100 dark:bg-white/5" />
                  <div className="ml-6 flex flex-col gap-2 border-l border-gray-100 pl-4 dark:border-gray-800">
                    <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : treeError ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-error-200 p-4 dark:border-error-500/30">
              <p className="text-sm text-error-600 dark:text-error-400">
                {treeError}
              </p>
              <button
                type="button"
                onClick={() => setTreeReloadToken((n) => n + 1)}
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Try again
              </button>
            </div>
          ) : visibleSubjects.length === 0 ? (
            <p className="text-sm text-gray-400">
              No subjects in this track yet.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {visibleSubjects.map((subject) => (
                <div key={subject.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 text-gray-400" />
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {subject.name}
                    </span>
                    <Badge size="sm" color="light">
                      {TRACK_LABEL[subject.track]}
                    </Badge>
                  </div>
                  <ul className="ml-6 flex flex-col gap-1 border-l border-gray-100 pl-4 dark:border-gray-800">
                    {(topicsBySubject[subject.id] ?? []).map((topic) => (
                      <li key={topic.id}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTopicId((prev) =>
                              prev === topic.id ? null : topic.id,
                            )
                          }
                          className={`w-full truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            selectedTopicId === topic.id
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                          }`}
                        >
                          {topic.name}
                        </button>
                      </li>
                    ))}
                    {(topicsBySubject[subject.id] ?? []).length === 0 && (
                      <li className="px-2 py-1 text-xs text-gray-400">
                        No topics yet
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decks panel */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            {selectedTopicName ? `Decks in "${selectedTopicName}"` : "Decks"}
          </h2>

          {selectedTopicId === null ? (
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select a topic
              </p>
              <p className="text-xs text-gray-400">
                Pick a topic on the left to see its decks.
              </p>
            </div>
          ) : decksLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
                />
              ))}
            </div>
          ) : decksError ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-error-200 p-4 dark:border-error-500/30">
              <p className="text-sm text-error-600 dark:text-error-400">
                {decksError}
              </p>
              <button
                type="button"
                onClick={() => setDecksReloadToken((n) => n + 1)}
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Try again
              </button>
            </div>
          ) : decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No decks in this topic yet
              </p>
              <p className="text-xs text-gray-400">
                Use "New Deck" above to add one.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {decks.map((deck) => {
                const status = deck.status ? STATUS_BADGE[deck.status] : null;
                return (
                  <li
                    key={deck.id}
                    className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-800 dark:text-white/90">
                            {deck.title}
                          </span>
                          {status && (
                            <Badge size="sm" color={status.color}>
                              {status.label}
                            </Badge>
                          )}
                        </div>
                        {deck.description && (
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {deck.description}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => setCardsModalDeck(deck)}
                          className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          <CopyIcon className="h-3.5 w-3.5" />
                          {deck.card_count ?? 0} card
                          {deck.card_count === 1 ? "" : "s"} — manage
                        </button>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <IconButton
                          label="Edit deck"
                          icon={<PencilIcon className="h-4 w-4" />}
                          onClick={() => setFormMode({ mode: "edit", deck })}
                        />
                        {deck.status !== "published" && (
                          <IconButton
                            label="Publish deck"
                            icon={<CheckCircleIcon className="h-4 w-4" />}
                            onClick={() => handlePublish(deck)}
                            loading={publishingId === deck.id}
                          />
                        )}
                        <IconButton
                          label="Delete deck"
                          icon={<TrashBinIcon className="h-4 w-4" />}
                          onClick={() => handleDelete(deck)}
                          loading={deletingId === deck.id}
                          tone="danger"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {formMode && selectedTopicId !== null && (
        <DeckFormModal
          deck={formMode.mode === "edit" ? formMode.deck : null}
          topicId={selectedTopicId}
          topicName={selectedTopicName ?? ""}
          onClose={() => setFormMode(null)}
          onSaved={handleSaved}
        />
      )}

      {cardsModalDeck && (
        <DeckCardsModal
          deck={cardsModalDeck}
          onClose={() => setCardsModalDeck(null)}
          onCardCountChange={handleCardCountChange}
        />
      )}
    </>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  loading = false,
  tone = "default",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        tone === "danger"
          ? "text-gray-400 hover:bg-error-50 hover:text-error-600 dark:text-gray-500 dark:hover:bg-error-500/10 dark:hover:text-error-400"
          : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/5 dark:hover:text-gray-300"
      }`}
    >
      {loading ? (
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        icon
      )}
    </button>
  );
}
