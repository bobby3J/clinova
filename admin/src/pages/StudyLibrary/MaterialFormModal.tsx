import { useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { createMaterial, updateMaterial } from "../../lib/studyLibrary";
import { ApiError } from "../../types/common";
import type { MaterialType } from "../../types/common";
import type { StudyMaterial } from "../../types/studyLibrary";

type TopicOption = { id: number; label: string };

type Props = {
  /** Editing an existing material, or creating a new one. */
  material: StudyMaterial | null;
  /** Only used in create mode — topic/type are fixed once a material exists. */
  topicOptions: TopicOption[];
  defaultTopicId: number | null;
  onClose: () => void;
  onSaved: (material: StudyMaterial) => void;
};

const TYPE_OPTIONS: { value: MaterialType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "tip", label: "Exam Tip" },
];

/** Note and Tip both carry their content as body text; Video/Audio carry a URL instead. */
function isTextBased(type: MaterialType): boolean {
  return type === "note" || type === "tip";
}

/**
 * One form, two modes — create and edit hit different endpoints with
 * different allowed fields (StoreStudyMaterialRequest vs
 * UpdateStudyMaterialRequest: topic_id/type are create-only, the backend
 * has no route to change them afterward), but share enough layout that
 * splitting into two components would just duplicate the body/url
 * conditional logic.
 */
export default function MaterialFormModal({
  material,
  topicOptions,
  defaultTopicId,
  onClose,
  onSaved,
}: Props) {
  const isEdit = material !== null;

  const [topicId, setTopicId] = useState<number | "">(
    defaultTopicId ?? (topicOptions[0]?.id ?? ""),
  );
  const [type, setType] = useState<MaterialType>(material?.type ?? "note");
  const [title, setTitle] = useState(material?.title ?? "");
  const [body, setBody] = useState(material?.body ?? "");
  const [url, setUrl] = useState(material?.url ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    material?.duration_minutes ? String(material.duration_minutes) : "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
    {},
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (!isEdit && topicId === "") {
      setFieldErrors({ topic_id: ["Pick a topic."] });
      return;
    }

    setSubmitting(true);
    try {
      const duration = durationMinutes.trim()
        ? Number(durationMinutes)
        : null;

      if (isEdit) {
        const res = await updateMaterial(material.id, {
          title,
          body: isTextBased(type) ? body || null : null,
          url: isTextBased(type) ? null : url || null,
          duration_minutes: duration,
        });
        onSaved(res.data);
      } else {
        const res = await createMaterial({
          topic_id: topicId as number,
          type,
          title,
          body: isTextBased(type) ? body || null : null,
          url: isTextBased(type) ? null : url || null,
          duration_minutes: duration,
        });
        onSaved(res.data);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.errors) {
        setFieldErrors(err.errors);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function fieldError(name: string) {
    return fieldErrors[name]?.[0];
  }

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white p-6 dark:bg-gray-dark"
      >
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? "Edit material" : "New material"}
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          {!isEdit && (
            <div>
              <Label htmlFor="topic_id">Topic</Label>
              <select
                id="topic_id"
                value={topicId}
                onChange={(e) => setTopicId(Number(e.target.value))}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              >
                {topicOptions.length === 0 && <option value="">—</option>}
                {topicOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {fieldError("topic_id") && (
                <p className="mt-1 text-xs text-error-500">
                  {fieldError("topic_id")}
                </p>
              )}
            </div>
          )}

          {!isEdit && (
            <div>
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as MaterialType)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Normal Vital Sign Ranges"
              error={Boolean(fieldError("title"))}
              hint={fieldError("title")}
            />
          </div>

          {isTextBased(type) ? (
            <div>
              <Label htmlFor="body">Body</Label>
              <textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder={
                  type === "tip" ? "Exam tip content…" : "Note content…"
                }
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
              {fieldError("body") && (
                <p className="mt-1 text-xs text-error-500">
                  {fieldError("body")}
                </p>
              )}
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="url">
                  {type === "video" ? "Video URL" : "Audio URL"}
                </Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  error={Boolean(fieldError("url"))}
                  hint={fieldError("url")}
                />
              </div>
              <div>
                <Label htmlFor="duration_minutes">Duration (minutes)</Label>
                <Input
                  id="duration_minutes"
                  type="number"
                  min="1"
                  max="600"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="e.g. 12"
                  error={Boolean(fieldError("duration_minutes"))}
                  hint={fieldError("duration_minutes")}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
