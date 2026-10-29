import type { ContentStatus, MaterialType, Track } from "./common";

/**
 * Mirrors api/docs/API_REFERENCE.md §StudyLibrary and the real Resources
 * (app/Domain/StudyLibrary/Http/Resources/*.php) exactly — there is no
 * single endpoint that returns the full Subject -> Topic -> StudyMaterial
 * tree in one call:
 *
 * - GET /study-library/subjects            -> Subject[] (flat, no topics)
 * - GET /study-library/topics?subject_id=N -> Topic[] for that subject
 *   (TopicResource doesn't even include subject_id — the caller already
 *   knows it, since it's the param that was just sent)
 * - GET /study-library/topics/{id}/materials -> StudyMaterial[] for one
 *   topic only (there's no bulk "all materials" endpoint)
 *
 * StudyLibrary.tsx fetches subjects, then topics per subject (cheap — few
 * subjects), then materials lazily per selected topic (avoids an N+1 fetch
 * across every topic's materials just to render the page).
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
  // Absent (not null) for non-admins — StudyMaterialResource only includes
  // these keys at all when the caller is an admin. This console is
  // admin-only, so in practice they're always present here.
  status?: ContentStatus;
  published_at?: string | null;
}

/**
 * Matches StoreStudyMaterialRequest::rules() exactly — topic_id and type
 * are only settable at creation (UpdateStudyMaterialRequest doesn't accept
 * either), and whether body or url is required depends on type.
 */
export interface CreateStudyMaterialPayload {
  topic_id: number;
  type: MaterialType;
  title: string;
  body?: string | null;
  url?: string | null;
  duration_minutes?: number | null;
}

/**
 * Matches UpdateStudyMaterialRequest::rules() — every field is
 * `sometimes`, so this only ever sends what actually changed.
 */
export interface UpdateStudyMaterialPayload {
  title?: string;
  body?: string | null;
  url?: string | null;
  duration_minutes?: number | null;
}

/**
 * Subject and Topic now have full CRUD on the backend (PATCH/DELETE added
 * alongside StudyMaterial's — see app/Domain/StudyLibrary/routes.php and
 * Update{Subject,Topic}Request::rules()). Deleting either cascades to its
 * children at the DB level (migrations' ->cascadeOnDelete()).
 */
export interface CreateSubjectPayload {
  name: string;
  track: Track;
}

export interface UpdateSubjectPayload {
  name?: string;
  track?: Track;
}

export interface CreateTopicPayload {
  subject_id: number;
  name: string;
  order?: number;
}

export interface UpdateTopicPayload {
  name?: string;
  order?: number;
}
