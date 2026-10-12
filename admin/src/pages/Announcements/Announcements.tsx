import { useState } from "react";
import type { FormEvent } from "react";
import PageMeta from "../../components/common/PageMeta";
import Label from "../../components/form/Label";
import Input from "../../components/form/InputField";
import Button from "../../components/ui/button/Button";
import { PaperPlaneIcon } from "../../icons";
import { sendAnnouncement } from "../../lib/announcements";
import { ApiError } from "../../types/common";
import type { Track } from "../../types/common";

type TrackChoice = Track | "all";

type SentEntry = {
  id: number;
  title: string;
  target: string;
  recipientCount: number;
  sentAt: Date;
};

const TRACK_LABEL: Record<Track, string> = {
  nursing: "Nursing",
  midwifery: "Midwifery",
};

function describeTarget(track: TrackChoice, level: string): string {
  const trackPart = track === "all" ? "All tracks" : TRACK_LABEL[track];
  return level.trim() ? `${trackPart} · Level "${level.trim()}"` : trackPart;
}

/**
 * No list/history endpoint exists for this domain (see
 * src/lib/announcements.ts's top comment) — `sentThisSession` is
 * deliberately local-only state, not a fetched resource. It's cleared on
 * refresh and never claims otherwise; the heading says "this session" on
 * purpose so it's never mistaken for a persisted log.
 */
export default function Announcements() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [track, setTrack] = useState<TrackChoice>("all");
  const [level, setLevel] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>(
    {},
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [sentThisSession, setSentThisSession] = useState<SentEntry[]>([]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    const target = describeTarget(track, level);
    if (
      !window.confirm(
        `Send "${title}" to every matching student (${target})? This can't be undone or unsent.`,
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await sendAnnouncement({
        title,
        body,
        track: track === "all" ? null : track,
        level: level.trim() || null,
      });

      setSuccessMessage(
        `${res.message} Reached ${res.data.recipient_count} student${res.data.recipient_count === 1 ? "" : "s"}.`,
      );
      setSentThisSession((prev) => [
        {
          id: Date.now(),
          title,
          target,
          recipientCount: res.data.recipient_count,
          sentAt: new Date(),
        },
        ...prev,
      ]);
      setTitle("");
      setBody("");
      setTrack("all");
      setLevel("");
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
    <>
      <PageMeta
        title="Announcements | Clinova Admin"
        description="Broadcast a notification to students."
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Announcements
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Broadcasts an in-app notification to every matching student,
          optionally narrowed by track and level. There's no history to look
          back on — this isn't stored anywhere an admin can query it again,
          only in each recipient's own notifications.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] lg:col-span-2">
          {formError && (
            <div className="mb-4 rounded-lg bg-error-50 px-4 py-2.5 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400">
              {formError}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 rounded-lg bg-success-50 px-4 py-2.5 text-sm text-success-600 dark:bg-success-500/10 dark:text-success-500">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="announcement_title">Title</Label>
              <Input
                id="announcement_title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New Pharmacology deck is live"
                error={Boolean(fieldErrors.title?.[0])}
                hint={fieldErrors.title?.[0]}
              />
            </div>

            <div>
              <Label htmlFor="announcement_body">Message</Label>
              <textarea
                id="announcement_body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={2000}
                placeholder="What should students know?"
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
              />
              <div className="mt-1 flex items-center justify-between">
                {fieldErrors.body?.[0] ? (
                  <p className="text-xs text-error-500">{fieldErrors.body[0]}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-gray-400">{body.length}/2000</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="announcement_track">Track</Label>
                <select
                  id="announcement_track"
                  value={track}
                  onChange={(e) => setTrack(e.target.value as TrackChoice)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90"
                >
                  <option value="all">All tracks</option>
                  <option value="nursing">Nursing only</option>
                  <option value="midwifery">Midwifery only</option>
                </select>
              </div>
              <div>
                <Label htmlFor="announcement_level">Level (optional)</Label>
                <Input
                  id="announcement_level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  placeholder="e.g. Year 2"
                  error={Boolean(fieldErrors.level?.[0])}
                  hint={fieldErrors.level?.[0]}
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <Button type="submit" disabled={submitting}>
                <PaperPlaneIcon className="mr-1.5 h-4 w-4" />
                {submitting ? "Sending…" : "Send announcement"}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Sent this session
          </h2>
          {sentThisSession.length === 0 ? (
            <p className="text-sm text-gray-400">
              Nothing sent yet. This list isn't saved anywhere — it clears on
              refresh.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sentThisSession.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-xl border border-gray-100 p-3 dark:border-gray-800"
                >
                  <p className="font-medium text-gray-800 dark:text-white/90">
                    {entry.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {entry.target} · {entry.recipientCount} recipient
                    {entry.recipientCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {entry.sentAt.toLocaleTimeString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
