import { createContext, useContext, useState, type ReactNode } from "react";

/**
 * Carries the in-progress focus session across the three-screen flow
 * (setup -> active -> break) without threading it through URL params or
 * route state — simpler for a strictly linear flow, same
 * context-for-shared-UI-state convention AuthContext already uses.
 *
 * Deliberately not persisted (no localStorage) — refreshing mid-timer
 * loses the in-progress session and the student has to start a new one.
 * The backend row from the abandoned session just sits as
 * completed: false, an honest record, not a bug. Revisit this if "resume
 * after refresh" turns out to matter in practice.
 */
type InProgressSession = {
  sessionId: number;
  plannedMinutes: number;
  soundId: number | null;
  soundName: string | null;
  soundUrl: string | null;
  startedAt: string;
};

type StudySessionContextType = {
  session: InProgressSession | null;
  setSession: (session: InProgressSession | null) => void;
};

const StudySessionContext = createContext<StudySessionContextType | undefined>(
  undefined,
);

export function StudySessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<InProgressSession | null>(null);

  return (
    <StudySessionContext.Provider value={{ session, setSession }}>
      {children}
    </StudySessionContext.Provider>
  );
}

export const useStudySession = () => {
  const context = useContext(StudySessionContext);
  if (context === undefined) {
    throw new Error(
      "useStudySession must be used within a StudySessionProvider",
    );
  }
  return context;
};

export type { InProgressSession };
