import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import {
  createSound,
  createSoundWithFile,
  updateSound,
  updateSoundWithFile,
} from "../../lib/soundLibrary";
import { ApiError } from "../../types/common";
import type { Sound } from "../../types/soundLibrary";

type Props = {
  sound: Sound | null;
  onClose: () => void;
  onSaved: (sound: Sound) => void;
};

type SourceMode = "url" | "upload";

const CATEGORY_SUGGESTIONS = ["Nature", "Music", "Noise", "Ambient"];
// Mirrors StoreSoundRequest/UpdateSoundRequest's mimes:... and max:20480
// (KB) rules on the backend — checked here too so a bad file is rejected
// immediately instead of after a round trip.
const ACCEPTED_TYPES = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB

export default function SoundFormModal({ sound, onClose, onSaved }: Props) {
  const isEdit = sound !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourceMode, setSourceMode] = useState<SourceMode>("url");
  const [name, setName] = useState(sound?.name ?? "");
  const [category, setCategory] = useState(sound?.category ?? "");
  const [fileUrl, setFileUrl] = useState(sound?.file_url ?? "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [fileHint, setFileHint] = useState<string | null>(null);
  const [source, setSource] = useState(sound?.source ?? "");
  const [license, setLicense] = useState(sound?.license ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
    {},
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setFileHint(null);
    if (file && file.size > MAX_FILE_BYTES) {
      setAudioFile(null);
      setFileHint(
        `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 20MB.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setAudioFile(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    if (sourceMode === "upload" && !audioFile && !isEdit) {
      setFileHint("Choose a file to upload.");
      return;
    }

    setSubmitting(true);
    try {
      let res;
      if (sourceMode === "upload" && audioFile) {
        const formData = new FormData();
        formData.append("name", name);
        formData.append("category", category);
        formData.append("audio_file", audioFile);
        if (source) formData.append("source", source);
        if (license) formData.append("license", license);
        res = isEdit
          ? await updateSoundWithFile(sound.id, formData)
          : await createSoundWithFile(formData);
      } else {
        const payload = {
          name,
          category,
          file_url: fileUrl,
          source: source || null,
          license: license || null,
        };
        res = isEdit
          ? await updateSound(sound.id, payload)
          : await createSound(payload);
      }
      onSaved(res.data);
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

  return (
    <Modal isOpen onClose={onClose} className="max-w-lg">
      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-white p-6 dark:bg-gray-dark"
      >
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">
          {isEdit ? "Edit sound" : "New sound"}
        </h3>

        {formError && (
          <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
            {formError}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="sound_name">Name</Label>
            <Input
              id="sound_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rain Sounds"
              error={Boolean(fieldErrors.name?.[0])}
              hint={fieldErrors.name?.[0]}
            />
          </div>

          <div>
            <Label htmlFor="sound_category">Category</Label>
            <Input
              id="sound_category"
              list="sound-category-suggestions"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Nature"
              error={Boolean(fieldErrors.category?.[0])}
              hint={fieldErrors.category?.[0]}
            />
            <datalist id="sound-category-suggestions">
              {CATEGORY_SUGGESTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          <div>
            <Label>Audio</Label>
            <div className="mb-2 inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-white/[0.03]">
              <button
                type="button"
                onClick={() => setSourceMode("url")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  sourceMode === "url"
                    ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Paste URL
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("upload")}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  sourceMode === "upload"
                    ? "bg-white text-gray-800 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Upload file
              </button>
            </div>

            {sourceMode === "url" ? (
              <>
                <Input
                  id="sound_file_url"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://…"
                  error={Boolean(fieldErrors.file_url?.[0])}
                  hint={
                    fieldErrors.file_url?.[0] ??
                    "Points at audio that's already hosted and cleared for use."
                  }
                />
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES.join(",")}
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-600 hover:file:bg-brand-100 dark:text-gray-400 dark:file:bg-brand-500/15 dark:file:text-brand-400"
                />
                {isEdit && !audioFile && (
                  <p className="mt-1 text-xs text-gray-400">
                    Leave empty to keep the current audio.
                  </p>
                )}
                {audioFile && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {audioFile.name} ({(audioFile.size / (1024 * 1024)).toFixed(1)}MB)
                  </p>
                )}
                {(fileHint || fieldErrors.audio_file?.[0]) && (
                  <p className="mt-1 text-xs text-error-500">
                    {fileHint ?? fieldErrors.audio_file?.[0]}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  MP3, WAV, OGG, M4A, or AAC — up to 20MB.
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sound_source">Source (optional)</Label>
              <Input
                id="sound_source"
                value={source ?? ""}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. freesound.org"
                error={Boolean(fieldErrors.source?.[0])}
                hint={fieldErrors.source?.[0]}
              />
            </div>
            <div>
              <Label htmlFor="sound_license">License (optional)</Label>
              <Input
                id="sound_license"
                value={license ?? ""}
                onChange={(e) => setLicense(e.target.value)}
                placeholder="e.g. CC0"
                error={Boolean(fieldErrors.license?.[0])}
                hint={fieldErrors.license?.[0]}
              />
            </div>
          </div>
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
