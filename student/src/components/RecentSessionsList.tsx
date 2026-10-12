import { CheckIcon, HeadphonesIcon } from "./icons";
import type { StudySession } from "../types/studySessions";

/**
 * Shared between Progress.tsx (its own "Recent Sessions" card) and
 * StudyWithMe/SessionSetup.tsx's "My Sessions" tab — same list, same
 * data, not two copies that could drift apart.
 */
export default function RecentSessionsList({
  sessions,
  soundNameById,
}: {
  sessions: StudySession[];
  soundNameById: Map<number, string>;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-theme-sm">
      <p className="mb-3 text-sm font-semibold text-gray-800">Recent Sessions</p>
      {sessions.length === 0 ? (
        <p className="text-xs text-gray-400">No sessions yet — start one from Study With Me.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-gray-50">
          {sessions.map((session) => (
            <li key={session.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-2">
                <HeadphonesIcon className="h-4 w-4 shrink-0 text-gray-300" />
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {session.actual_minutes} min
                  </p>
                  <p className="text-xs text-gray-400">
                    {session.sound_id ? soundNameById.get(session.sound_id) ?? "Sound" : "No sound"}
                  </p>
                </div>
              </div>
              {session.completed && <CheckIcon className="h-4 w-4 shrink-0 text-success-500" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
