import { Modal } from "../../components/ui/modal";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";
import { AlertIcon, AudioIcon, FileIcon, TimeIcon, VideoIcon } from "../../icons";
import type { ContentStatus, MaterialType } from "../../types/common";
import type { StudyMaterial } from "../../types/studyLibrary";

// Reuses AlertIcon rather than adding a new SVG asset — this codebase has
// a documented history of newly-added icon SVGs silently rendering
// invisible (missing fill), so reusing a known-good one sidesteps that
// class of bug entirely.
const TYPE_ICON: Record<MaterialType, typeof FileIcon> = {
  note: FileIcon,
  video: VideoIcon,
  audio: AudioIcon,
  tip: AlertIcon,
};

/** Note and Tip both carry their content as body text; Video/Audio carry a URL instead. */
function isTextBased(type: MaterialType): boolean {
  return type === "note" || type === "tip";
}

const STATUS_BADGE: Record<
  ContentStatus,
  { label: string; color: "light" | "warning" | "success" }
> = {
  draft: { label: "Draft", color: "light" },
  in_review: { label: "In review", color: "warning" },
  published: { label: "Published", color: "success" },
};

type Props = {
  material: StudyMaterial;
  onClose: () => void;
  onEdit: () => void;
};

/**
 * Read-only — the Materials list only ever showed title/status/duration,
 * so "actually read what this note says" had no path except opening the
 * Edit form, which is a write affordance for a read need. This is that
 * missing read path; "Edit" below hands off to MaterialFormModal.
 */
export default function MaterialDetailModal({
  material,
  onClose,
  onEdit,
}: Props) {
  const TypeIcon = TYPE_ICON[material.type];
  const status = material.status ? STATUS_BADGE[material.status] : null;

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <div className="rounded-3xl bg-white p-6 dark:bg-gray-dark">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
            <TypeIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {material.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {status && (
                <Badge size="sm" color={status.color}>
                  {status.label}
                </Badge>
              )}
              {material.duration_minutes && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <TimeIcon className="h-3.5 w-3.5" />
                  {material.duration_minutes} min
                </span>
              )}
            </div>
          </div>
        </div>

        {isTextBased(material.type) ? (
          <div className="max-h-80 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
            {material.body || (
              <span className="text-gray-400">No body text.</span>
            )}
          </div>
        ) : (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
              {material.type === "video" ? "Video URL" : "Audio URL"}
            </p>
            {material.url ? (
              <a
                href={material.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-brand-600 hover:underline dark:border-gray-800 dark:bg-white/[0.03] dark:text-brand-400"
              >
                {material.url}
              </a>
            ) : (
              <p className="text-sm text-gray-400">No URL set.</p>
            )}
          </div>
        )}

        {material.published_at && (
          <p className="mt-4 text-xs text-gray-400">
            Published {new Date(material.published_at).toLocaleString()}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </div>
    </Modal>
  );
}
