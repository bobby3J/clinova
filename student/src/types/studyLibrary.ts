import type { Track } from "./common";

/**
 * Mirrors admin/src/types/studyLibrary.ts's read side exactly — same
 * Resources, read-only subset (no Create/Update payloads, this app never
 * writes to this domain). `status`/`published_at` are omitted entirely
 * here, not just typed optional: StudyMaterialResource only includes them
 * for admins/lecturers at all, and a student token never gets them, so
 * there's nothing for this type to even allow.
 */
export interface Subject {
  id: number;
  name: string;
  slug: string;
  track: Track;
}

export interface Topic {
  id: number;
  name: string;
  slug: string;
  order: number;
}

export type MaterialType = "note" | "video" | "audio" | "tip" | "slides";

export interface StudyMaterial {
  id: number;
  topic_id: number;
  type: MaterialType;
  title: string;
  body: string | null;
  url: string | null;
  // Resolved server-side, present only for the Slides type — see
  // api/app/Domain/StudyLibrary/Models/StudyMaterial.php's resolvedFileUrl().
  file_url: string | null;
  duration_minutes: number | null;
}
