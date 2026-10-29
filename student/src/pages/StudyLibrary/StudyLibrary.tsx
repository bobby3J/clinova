import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router";
import AppShell from "../../components/AppShell";
import BottomNav from "../../components/BottomNav";
import MobileTopBar from "../../components/MobileTopBar";
import {
  AlertIcon,
  AudioIcon,
  BookIcon,
  ChevronLeftIcon,
  FolderIcon,
  SlidesIcon,
  VideoIcon,
} from "../../components/icons";
import { useAuth } from "../../context/AuthContext";
import { getSubjects, getTopics, getTopicMaterials } from "../../lib/studyLibrary";
import type { Subject, Topic, StudyMaterial, MaterialType } from "../../types/studyLibrary";

// Lazy, not a static import — react-pdf + pdfjs-dist added ~380KB to the
// main bundle, downloaded by every student on every page load regardless
// of whether they ever open a Slides material. Split into its own chunk,
// fetched only the moment someone actually views one.
const SlideViewer = lazy(() => import("../../components/SlideViewer"));

type Level = "subjects" | "topics" | "materials" | "detail";

const TYPE_ICON: Record<MaterialType, typeof BookIcon> = {
  note: BookIcon,
  video: VideoIcon,
  audio: AudioIcon,
  tip: AlertIcon,
  slides: SlidesIcon,
};

/** Note and Tip both carry their content as body text; Video/Audio carry a URL instead. */
function isTextBased(type: MaterialType): boolean {
  return type === "note" || type === "tip";
}

/** The one uploaded-file type — see api's StoreStudyMaterialRequest's slide_file rule. */
function isFileBased(type: MaterialType): boolean {
  return type === "slides";
}

/**
 * A single drill-down screen (Subjects -> Topics -> Materials -> Detail)
 * rather than four separate routes — same reasoning SessionSetup's
 * back-chevron uses, just one level deeper. A real URL per level would
 * mean more plumbing for something that's fundamentally "pop one level
 * back," which this already handles with local state + the same back-
 * chevron pattern already established elsewhere in this app.
 */
export default function StudyLibrary() {
  const { user } = useAuth();
  const [level, setLevel] = useState<Level>("subjects");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Filtered to the student's own track when it's set — showing both
    // tracks' curriculum to a student who's only enrolled in one would be
    // noise, not a feature. Falls back to everything if track is unset.
    getSubjects(user?.track ?? undefined)
      .then((res) => setSubjects(res.data))
      .catch(() => setError("Couldn't load subjects. Check your connection and try again."))
      .finally(() => setLoading(false));
  }, [user?.track]);

  function openSubject(subject: Subject) {
    setSelectedSubject(subject);
    setLevel("topics");
    setLoading(true);
    setError(null);
    getTopics(subject.id)
      .then((res) => setTopics(res.data))
      .catch(() => setError("Couldn't load topics. Check your connection and try again."))
      .finally(() => setLoading(false));
  }

  function openTopic(topic: Topic) {
    setSelectedTopic(topic);
    setLevel("materials");
    setLoading(true);
    setError(null);
    getTopicMaterials(topic.id)
      .then((res) => setMaterials(res.data))
      .catch(() => setError("Couldn't load materials. Check your connection and try again."))
      .finally(() => setLoading(false));
  }

  function openMaterial(material: StudyMaterial) {
    setSelectedMaterial(material);
    setLevel("detail");
  }

  function goBack() {
    if (level === "detail") {
      setSelectedMaterial(null);
      setLevel("materials");
    } else if (level === "materials") {
      setSelectedTopic(null);
      setLevel("topics");
    } else if (level === "topics") {
      setSelectedSubject(null);
      setLevel("subjects");
    }
  }

  const title =
    level === "subjects"
      ? "Study Library"
      : level === "topics"
        ? selectedSubject?.name ?? "Topics"
        : level === "materials"
          ? selectedTopic?.name ?? "Materials"
          : selectedMaterial?.title ?? "Material";

  return (
    <AppShell background="bg-gray-50">
      <MobileTopBar />
      <div className="px-5 pt-6 pb-28 lg:mx-auto lg:max-w-2xl lg:px-0 lg:pt-0 lg:pb-0">
        <div className="mb-5 flex items-center gap-3">
          {level === "subjects" ? (
            <Link to="/" className="text-gray-500">
              <ChevronLeftIcon className="h-5 w-5" />
            </Link>
          ) : (
            <button type="button" onClick={goBack} className="text-gray-500">
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
          )}
          <h1 className="truncate text-lg font-semibold text-gray-800 lg:text-2xl">{title}</h1>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-error-600">{error}</p>
        ) : level === "subjects" ? (
          subjects.length === 0 ? (
            <EmptyState text="No subjects available yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {subjects.map((subject) => (
                <li key={subject.id}>
                  <button
                    type="button"
                    onClick={() => openSubject(subject)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-theme-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                      <FolderIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{subject.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : level === "topics" ? (
          topics.length === 0 ? (
            <EmptyState text="No topics in this subject yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {topics.map((topic) => (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => openTopic(topic)}
                    className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-theme-sm"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                      <FolderIcon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-gray-800">{topic.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : level === "materials" ? (
          materials.length === 0 ? (
            <EmptyState text="No published materials in this topic yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {materials.map((material) => {
                const Icon = TYPE_ICON[material.type];
                return (
                  <li key={material.id}>
                    <button
                      type="button"
                      onClick={() => openMaterial(material)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-theme-sm"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-800">
                          {material.title}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">
                          {material.type}
                          {material.duration_minutes ? ` · ${material.duration_minutes} min` : ""}
                        </p>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          selectedMaterial && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
              {isTextBased(selectedMaterial.type) ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                  {selectedMaterial.body || "No content yet."}
                </p>
              ) : isFileBased(selectedMaterial.type) ? (
                selectedMaterial.file_url ? (
                  <Suspense
                    fallback={
                      <p className="py-10 text-center text-sm text-gray-400">
                        Loading slides…
                      </p>
                    }
                  >
                    <SlideViewer fileUrl={selectedMaterial.file_url} />
                  </Suspense>
                ) : (
                  <p className="text-sm text-gray-400">No file set.</p>
                )
              ) : selectedMaterial.url ? (
                <a
                  href={selectedMaterial.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-600"
                >
                  {selectedMaterial.type === "video" ? (
                    <VideoIcon className="h-4 w-4" />
                  ) : (
                    <AudioIcon className="h-4 w-4" />
                  )}
                  Open {selectedMaterial.type}
                </a>
              ) : (
                <p className="text-sm text-gray-400">No content set.</p>
              )}
            </div>
          )
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center">
      <FolderIcon className="h-6 w-6 text-gray-300" />
      <p className="text-xs text-gray-400">{text}</p>
    </div>
  );
}
