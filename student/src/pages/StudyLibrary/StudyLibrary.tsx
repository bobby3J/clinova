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
import type {
  AcademicYear,
  Semester,
  Subject,
  Topic,
  StudyMaterial,
  MaterialType,
} from "../../types/studyLibrary";

// Lazy, not a static import — react-pdf + pdfjs-dist added ~380KB to the
// main bundle, downloaded by every student on every page load regardless
// of whether they ever open a Slides material. Split into its own chunk,
// fetched only the moment someone actually views one.
const SlideViewer = lazy(() => import("../../components/SlideViewer"));

type Level =
  | "years"
  | "semesters"
  | "subjects"
  | "topics"
  | "materials"
  | "detail";

const TYPE_ICON: Record<MaterialType, typeof BookIcon> = {
  note: BookIcon,
  video: VideoIcon,
  audio: AudioIcon,
  tip: AlertIcon,
  slides: SlidesIcon,
};

// Year/Semester are a fixed 4x2 grid — organizing structure on top of
// Subject, not anything a student creates. Reuses this app's existing
// accent tokens (no blue-light here, unlike admin) so the new landing
// screens feel native, not bolted on.
const YEAR_OPTIONS: { value: AcademicYear; label: string }[] = [
  { value: 1, label: "First Year" },
  { value: 2, label: "Second Year" },
  { value: 3, label: "Third Year" },
  { value: 4, label: "Fourth Year" },
];

const SEMESTER_OPTIONS: { value: Semester; label: string }[] = [
  { value: 1, label: "First Semester" },
  { value: 2, label: "Second Semester" },
];

const YEAR_ACCENT: Record<AcademicYear, string> = {
  1: "bg-brand-50 text-brand-600",
  2: "bg-success-50 text-success-600",
  3: "bg-warning-50 text-warning-600",
  4: "bg-error-50 text-error-600",
};

const SEMESTER_ACCENT: Record<Semester, string> = {
  1: YEAR_ACCENT[1],
  2: YEAR_ACCENT[2],
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
  const [level, setLevel] = useState<Level>("years");

  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(
    null,
  );

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

  function openYear(year: AcademicYear) {
    setSelectedYear(year);
    setLevel("semesters");
  }

  function openSemester(semester: Semester) {
    setSelectedSemester(semester);
    setLevel("subjects");
  }

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
    } else if (level === "subjects") {
      setSelectedSemester(null);
      setLevel("semesters");
    } else if (level === "semesters") {
      setSelectedYear(null);
      setLevel("years");
    }
  }

  const visibleSubjects = subjects.filter(
    (subject) =>
      subject.year === selectedYear && subject.semester === selectedSemester,
  );

  const yearCounts: Record<AcademicYear, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  subjects.forEach((subject) => {
    yearCounts[subject.year] += 1;
  });

  const semesterCounts: Record<Semester, number> = { 1: 0, 2: 0 };
  subjects
    .filter((subject) => subject.year === selectedYear)
    .forEach((subject) => {
      semesterCounts[subject.semester] += 1;
    });

  const title =
    level === "years"
      ? "Study Library"
      : level === "semesters"
        ? (selectedYear && YEAR_OPTIONS[selectedYear - 1].label) ?? "Semesters"
        : level === "subjects"
          ? (selectedSemester &&
              SEMESTER_OPTIONS[selectedSemester - 1].label) ??
            "Subjects"
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
          {level === "years" ? (
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
        ) : level === "years" ? (
          <div className="grid grid-cols-2 gap-4">
            {YEAR_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => openYear(opt.value)}
                className="flex flex-col items-start rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-theme-sm transition-transform active:scale-[0.98]"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${YEAR_ACCENT[opt.value]}`}
                >
                  {opt.value}
                </span>
                <p className="mt-4 text-sm font-semibold text-gray-800">
                  {opt.label}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {yearCounts[opt.value]} subject
                  {yearCounts[opt.value] === 1 ? "" : "s"}
                </p>
              </button>
            ))}
          </div>
        ) : level === "semesters" ? (
          <div className="grid grid-cols-1 gap-4">
            {SEMESTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => openSemester(opt.value)}
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-theme-sm transition-transform active:scale-[0.98]"
              >
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${SEMESTER_ACCENT[opt.value]}`}
                >
                  {opt.value}
                </span>
                <span>
                  <p className="text-base font-semibold text-gray-800">
                    {opt.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {semesterCounts[opt.value]} subject
                    {semesterCounts[opt.value] === 1 ? "" : "s"}
                  </p>
                </span>
              </button>
            ))}
          </div>
        ) : level === "subjects" ? (
          visibleSubjects.length === 0 ? (
            <EmptyState text="No subjects here yet." />
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleSubjects.map((subject) => (
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
