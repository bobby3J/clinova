import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import MaterialFormModal from "./MaterialFormModal";
import MaterialDetailModal from "./MaterialDetailModal";
import SubjectFormModal from "./SubjectFormModal";
import TopicFormModal from "./TopicFormModal";
import {
  deleteMaterial,
  deleteSubject,
  deleteTopic,
  getSubjects,
  getTopicMaterials,
  getTopics,
  publishMaterial,
} from "../../lib/studyLibrary";
import {
  AlertIcon,
  AudioIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  DocsIcon,
  EyeIcon,
  FileIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TimeIcon,
  TrashBinIcon,
  VideoIcon,
} from "../../icons";
import {
  ApiError,
  type ContentStatus,
  type MaterialType,
  type Track,
} from "../../types/common";
import type { Subject, StudyMaterial, Topic } from "../../types/studyLibrary";

type FormMode = { mode: "create" } | { mode: "edit"; material: StudyMaterial };

const TYPE_ICON: Record<MaterialType, typeof FileIcon> = {
  note: FileIcon,
  video: VideoIcon,
  audio: AudioIcon,
  tip: AlertIcon,
  slides: DocsIcon,
};

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

export default function StudyLibrary() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topicsBySubject, setTopicsBySubject] = useState<
    Record<number, Topic[]>
  >({});
  const [treeLoading, setTreeLoading] = useState(true);
  const [treeError, setTreeError] = useState<string | null>(null);
  const [treeReloadToken, setTreeReloadToken] = useState(0);

  const [activeTrack, setActiveTrack] = useState<Track | "all">("all");
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materialsError, setMaterialsError] = useState<string | null>(null);
  const [materialsReloadToken, setMaterialsReloadToken] = useState(0);

  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(
    null,
  );
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [subjectFormMode, setSubjectFormMode] = useState<{
    subject: Subject | null;
  } | null>(null);
  const [topicFormMode, setTopicFormMode] = useState<{
    subject: Subject;
    topic: Topic | null;
  } | null>(null);
  const [deletingSubjectId, setDeletingSubjectId] = useState<number | null>(
    null,
  );
  const [deletingTopicId, setDeletingTopicId] = useState<number | null>(null);

  // Subjects, then topics per subject (in parallel — subject counts are
  // small, this isn't the N+1-prone fetch). Materials are deliberately
  // NOT fetched here; see the type file's comment on why there's no bulk
  // "all materials" call to make.
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
            : "Couldn't load the study library. Check your connection and try again.",
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

  // Materials are scoped to exactly one topic per the real endpoint
  // (GET /study-library/topics/{id}/materials) — fetched on demand as the
  // admin drills in, not held for every topic at once.
  useEffect(() => {
    if (selectedTopicId === null) {
      setMaterials([]);
      setMaterialsError(null);
      return;
    }

    let cancelled = false;
    setMaterialsLoading(true);
    setMaterialsError(null);

    getTopicMaterials(selectedTopicId)
      .then((res) => {
        if (!cancelled) setMaterials(res.data);
      })
      .catch((err) => {
        if (cancelled) return;
        setMaterialsError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load materials for this topic.",
        );
      })
      .finally(() => {
        if (!cancelled) setMaterialsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedTopicId, materialsReloadToken]);

  const visibleSubjects = useMemo(
    () =>
      activeTrack === "all"
        ? subjects
        : subjects.filter((subject) => subject.track === activeTrack),
    [subjects, activeTrack],
  );

  const topicCount = visibleSubjects.reduce(
    (sum, subject) => sum + (topicsBySubject[subject.id]?.length ?? 0),
    0,
  );

  const selectedTopicName = useMemo(() => {
    if (selectedTopicId === null) return null;
    for (const topics of Object.values(topicsBySubject)) {
      const match = topics.find((t) => t.id === selectedTopicId);
      if (match) return match.name;
    }
    return null;
  }, [topicsBySubject, selectedTopicId]);

  const visibleMaterials = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? materials.filter((m) => m.title.toLowerCase().includes(query))
      : materials;
  }, [materials, search]);

  // Flat "Topic name — Subject name" list for the create-material modal's
  // topic picker — built from whatever's already loaded, no extra fetch.
  const allTopicOptions = useMemo(
    () =>
      subjects.flatMap((subject) =>
        (topicsBySubject[subject.id] ?? []).map((topic) => ({
          id: topic.id,
          label: `${topic.name} — ${subject.name}`,
        })),
      ),
    [subjects, topicsBySubject],
  );

  function handleSaved(saved: StudyMaterial) {
    setFormMode(null);
    if (saved.topic_id === selectedTopicId) {
      setMaterials((prev) => {
        const exists = prev.some((m) => m.id === saved.id);
        return exists
          ? prev.map((m) => (m.id === saved.id ? saved : m))
          : [...prev, saved];
      });
    } else {
      // Created in a different topic than the one currently open — jump
      // there so the admin can actually see what they just made.
      setSelectedTopicId(saved.topic_id);
    }
  }

  async function handlePublish(material: StudyMaterial) {
    setActionError(null);
    setPublishingId(material.id);
    try {
      const res = await publishMaterial(material.id);
      setMaterials((prev) =>
        prev.map((m) => (m.id === material.id ? res.data : m)),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't publish this material.",
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDelete(material: StudyMaterial) {
    if (!window.confirm(`Delete "${material.title}"? This can't be undone.`)) {
      return;
    }
    setActionError(null);
    setDeletingId(material.id);
    try {
      await deleteMaterial(material.id);
      setMaterials((prev) => prev.filter((m) => m.id !== material.id));
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't delete this material.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleSubjectSaved(subject: Subject) {
    setSubjectFormMode(null);
    setSubjects((prev) => {
      const exists = prev.some((s) => s.id === subject.id);
      return exists
        ? prev.map((s) => (s.id === subject.id ? subject : s))
        : [...prev, subject];
    });
    setTopicsBySubject((prev) =>
      prev[subject.id] ? prev : { ...prev, [subject.id]: [] },
    );
    // Make sure the admin actually sees what they just created/edited,
    // even if they were filtered to a different track at the time.
    setActiveTrack("all");
  }

  function handleTopicSaved(subjectId: number, topic: Topic) {
    setTopicFormMode(null);
    setTopicsBySubject((prev) => {
      const existing = prev[subjectId] ?? [];
      const exists = existing.some((t) => t.id === topic.id);
      return {
        ...prev,
        [subjectId]: exists
          ? existing.map((t) => (t.id === topic.id ? topic : t))
          : [...existing, topic],
      };
    });
  }

  async function handleDeleteSubject(subject: Subject) {
    const topicCount = topicsBySubject[subject.id]?.length ?? 0;
    const warning =
      topicCount > 0
        ? `Delete "${subject.name}"? This also deletes its ${topicCount} topic${
            topicCount === 1 ? "" : "s"
          } and every material inside them. This can't be undone.`
        : `Delete "${subject.name}"? This can't be undone.`;
    if (!window.confirm(warning)) return;

    setActionError(null);
    setDeletingSubjectId(subject.id);
    try {
      await deleteSubject(subject.id);
      const removedTopicIds = new Set(
        (topicsBySubject[subject.id] ?? []).map((t) => t.id),
      );
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
      setTopicsBySubject((prev) => {
        const next = { ...prev };
        delete next[subject.id];
        return next;
      });
      if (selectedTopicId !== null && removedTopicIds.has(selectedTopicId)) {
        setSelectedTopicId(null);
      }
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't delete this subject.",
      );
    } finally {
      setDeletingSubjectId(null);
    }
  }

  async function handleDeleteTopic(subject: Subject, topic: Topic) {
    const knownMaterialCount =
      topic.id === selectedTopicId ? materials.length : null;
    const warning = knownMaterialCount
      ? `Delete "${topic.name}"? This also deletes its ${knownMaterialCount} material${
          knownMaterialCount === 1 ? "" : "s"
        }. This can't be undone.`
      : `Delete "${topic.name}"? Any materials inside it are deleted too. This can't be undone.`;
    if (!window.confirm(warning)) return;

    setActionError(null);
    setDeletingTopicId(topic.id);
    try {
      await deleteTopic(topic.id);
      setTopicsBySubject((prev) => ({
        ...prev,
        [subject.id]: (prev[subject.id] ?? []).filter((t) => t.id !== topic.id),
      }));
      if (selectedTopicId === topic.id) setSelectedTopicId(null);
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Couldn't delete this topic.",
      );
    } finally {
      setDeletingTopicId(null);
    }
  }

  return (
    <>
      <PageMeta
        title="Study Library | Clinova Admin"
        description="Manage subjects, topics, and study materials."
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
            Study Library
          </h1>
          <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
            Subjects, topics, and study materials (notes, video, audio, exam
            tips). Publishing a material is what makes it visible in the student
            app.
          </p>
        </div>
        <Button
          onClick={() => setFormMode({ mode: "create" })}
          disabled={allTopicOptions.length === 0}
          title={
            allTopicOptions.length === 0
              ? "Create a subject and topic first"
              : undefined
          }
          className="shrink-0 self-start disabled:cursor-not-allowed disabled:opacity-50 sm:self-center"
        >
          <PlusIcon className="mr-1.5 h-4 w-4" />
          New Material
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

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatTile label="Subjects" value={visibleSubjects.length} />
        <StatTile label="Topics" value={topicCount} />
        <StatTile
          label={selectedTopicName ? "Materials in topic" : "Materials"}
          value={selectedTopicId === null ? null : visibleMaterials.length}
        />
      </div>

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
        {/* Subjects & topics browser — hidden on mobile once a topic is
            picked, so the materials panel below isn't just more content to
            scroll past; lg+ always shows both side by side. */}
        <div
          className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-1 lg:block ${
            selectedTopicId !== null ? "hidden" : ""
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Subjects &amp; topics
            </h2>
            <button
              type="button"
              onClick={() => setSubjectFormMode({ subject: null })}
              className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add subject
            </button>
          </div>

          {treeLoading ? (
            <TreeSkeleton />
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
                  <div className="group mb-2 flex items-center gap-2">
                    <FolderIcon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate text-sm font-medium text-gray-800 dark:text-white/90">
                      {subject.name}
                    </span>
                    <Badge size="sm" color="light">
                      {TRACK_LABEL[subject.track]}
                    </Badge>
                    <div className="ml-auto flex shrink-0 items-center gap-0.5">
                      <IconButton
                        size="sm"
                        label="Edit subject"
                        icon={<PencilIcon className="h-3.5 w-3.5" />}
                        onClick={() => setSubjectFormMode({ subject })}
                      />
                      <IconButton
                        size="sm"
                        label="Delete subject"
                        icon={<TrashBinIcon className="h-3.5 w-3.5" />}
                        onClick={() => handleDeleteSubject(subject)}
                        loading={deletingSubjectId === subject.id}
                        tone="danger"
                      />
                    </div>
                  </div>
                  <ul className="ml-6 flex flex-col gap-1 border-l border-gray-100 pl-4 dark:border-gray-800">
                    {(topicsBySubject[subject.id] ?? []).map((topic) => (
                      <li key={topic.id} className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedTopicId((prev) =>
                              prev === topic.id ? null : topic.id,
                            )
                          }
                          className={`flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                            selectedTopicId === topic.id
                              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                              : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/5"
                          }`}
                        >
                          {topic.name}
                        </button>
                        <IconButton
                          size="sm"
                          label="Edit topic"
                          icon={<PencilIcon className="h-3 w-3" />}
                          onClick={() => setTopicFormMode({ subject, topic })}
                        />
                        <IconButton
                          size="sm"
                          label="Delete topic"
                          icon={<TrashBinIcon className="h-3 w-3" />}
                          onClick={() => handleDeleteTopic(subject, topic)}
                          loading={deletingTopicId === topic.id}
                          tone="danger"
                        />
                      </li>
                    ))}
                    {(topicsBySubject[subject.id] ?? []).length === 0 && (
                      <li className="px-2 py-1 text-xs text-gray-400">
                        No topics yet
                      </li>
                    )}
                    <li>
                      <button
                        type="button"
                        onClick={() =>
                          setTopicFormMode({ subject, topic: null })
                        }
                        className="flex w-full items-center gap-1 rounded-md border border-dashed border-gray-200 px-2 py-1 text-xs font-medium text-brand-600 transition-colors hover:border-brand-300 hover:bg-brand-50 dark:border-gray-700 dark:text-brand-400 dark:hover:bg-brand-500/10"
                      >
                        <PlusIcon className="h-3 w-3" />
                        Add topic
                      </button>
                    </li>
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Materials panel — stacks below the tree on mobile (so the
            "pick a topic" placeholder shows there too), but once a topic is
            picked the tree above hides and a back button appears, same
            drill-down as before. lg+ always shows both side by side. */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          {selectedTopicId !== null && (
            <button
              type="button"
              onClick={() => setSelectedTopicId(null)}
              className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 lg:hidden"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              Topics
            </button>
          )}
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              {selectedTopicName
                ? `Materials in "${selectedTopicName}"`
                : "Materials"}
            </h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search materials…"
              disabled={selectedTopicId === null}
              className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-white/90 sm:w-56"
            />
          </div>

          {selectedTopicId === null ? (
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select a topic
              </p>
              <p className="text-xs text-gray-400">
                <span className="lg:hidden">Pick a topic above</span>
                <span className="hidden lg:inline">
                  Pick a topic on the left
                </span>{" "}
                to see its materials.
              </p>
            </div>
          ) : materialsLoading ? (
            <MaterialsSkeleton />
          ) : materialsError ? (
            <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-error-200 p-4 dark:border-error-500/30">
              <p className="text-sm text-error-600 dark:text-error-400">
                {materialsError}
              </p>
              <button
                type="button"
                onClick={() => setMaterialsReloadToken((n) => n + 1)}
                className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Try again
              </button>
            </div>
          ) : visibleMaterials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-200 py-12 text-center dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {materials.length === 0
                  ? "No materials in this topic yet"
                  : "No materials match your search"}
              </p>
              {materials.length > 0 && (
                <p className="text-xs text-gray-400">
                  Try a different search term.
                </p>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleMaterials.map((material) => {
                const TypeIcon = TYPE_ICON[material.type];
                const status = material.status
                  ? STATUS_BADGE[material.status]
                  : null;
                return (
                  <li
                    key={material.id}
                    onClick={() => setViewingMaterial(material)}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-100 p-4 transition-colors hover:border-gray-200 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-700 dark:hover:bg-white/[0.03]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                      <TypeIcon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-800 dark:text-white/90">
                          {material.title}
                        </span>
                        {status && (
                          <Badge size="sm" color={status.color}>
                            {status.label}
                          </Badge>
                        )}
                      </div>
                      {material.duration_minutes && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                          <TimeIcon className="h-3.5 w-3.5" />
                          {material.duration_minutes} min
                        </p>
                      )}
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex shrink-0 items-center gap-1.5"
                    >
                      <IconButton
                        label="View"
                        icon={<EyeIcon className="h-4 w-4" />}
                        onClick={() => setViewingMaterial(material)}
                      />
                      <IconButton
                        label="Edit"
                        icon={<PencilIcon className="h-4 w-4" />}
                        onClick={() =>
                          setFormMode({ mode: "edit", material })
                        }
                      />
                      {material.status !== "published" && (
                        <IconButton
                          label="Publish"
                          icon={<CheckCircleIcon className="h-4 w-4" />}
                          onClick={() => handlePublish(material)}
                          loading={publishingId === material.id}
                        />
                      )}
                      <IconButton
                        label="Delete"
                        icon={<TrashBinIcon className="h-4 w-4" />}
                        onClick={() => handleDelete(material)}
                        loading={deletingId === material.id}
                        tone="danger"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {viewingMaterial && (
        <MaterialDetailModal
          material={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
          onEdit={() => {
            const material = viewingMaterial;
            setViewingMaterial(null);
            setFormMode({ mode: "edit", material });
          }}
        />
      )}

      {formMode && (
        <MaterialFormModal
          material={formMode.mode === "edit" ? formMode.material : null}
          topicOptions={allTopicOptions}
          defaultTopicId={selectedTopicId}
          onClose={() => setFormMode(null)}
          onSaved={handleSaved}
        />
      )}

      {subjectFormMode && (
        <SubjectFormModal
          subject={subjectFormMode.subject}
          onClose={() => setSubjectFormMode(null)}
          onSaved={handleSubjectSaved}
        />
      )}

      {topicFormMode && (
        <TopicFormModal
          subjectId={topicFormMode.subject.id}
          subjectName={topicFormMode.subject.name}
          topic={topicFormMode.topic}
          onClose={() => setTopicFormMode(null)}
          onSaved={(topic) => handleTopicSaved(topicFormMode.subject.id, topic)}
        />
      )}
    </>
  );
}

function StatTile({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
        {value === null ? "—" : value}
      </p>
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  loading = false,
  tone = "default",
  size = "md",
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  loading?: boolean;
  tone?: "default" | "danger";
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        size === "sm" ? "h-6 w-6" : "h-8 w-8"
      } ${
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

function TreeSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="animate-pulse">
          <div className="mb-2 h-4 w-2/3 rounded bg-gray-100 dark:bg-white/5" />
          <div className="ml-6 flex flex-col gap-2 border-l border-gray-100 pl-4 dark:border-gray-800">
            <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-white/5" />
            <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function MaterialsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800"
        >
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-lg bg-gray-100 dark:bg-white/5" />
          <div className="flex-1 animate-pulse">
            <div className="h-3.5 w-1/2 rounded bg-gray-100 dark:bg-white/5" />
            <div className="mt-2 h-3 w-1/4 rounded bg-gray-100 dark:bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
