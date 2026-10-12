import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useStudySession } from "../../context/StudySessionContext";
import { finishSession, getSessionHistory } from "../../lib/studySessions";
import AppShell from "../../components/AppShell";
import CircularTimer from "../../components/CircularTimer";
import GradientBackdrop from "../../components/GradientBackdrop";
import { HeadphonesIcon, PauseIcon, PlayIcon } from "../../components/icons";
import type { StudySession } from "../../types/studySessions";

const QUOTE = {
  line: "Progress, not perfection.",
  sub: "Keep going, you're doing great!",
};

export default function ActiveSession() {
  const { session, setSession } = useStudySession();
  const navigate = useNavigate();

  const totalSeconds = (session?.plannedMinutes ?? 0) * 60;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [todayStats, setTodayStats] = useState({ count: 0, minutes: 0 });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Tracks accumulated paused time so the Date.now()-based elapsed
  // calculation stays accurate across pause/resume, not just across a
  // backgrounded tab (a naive decrementing counter would drift in both
  // cases; this corrects for both).
  const pauseAccumRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const startedAtMs = useMemo(
    () => (session ? new Date(session.startedAt).getTime() : 0),
    [session],
  );

  useEffect(() => {
    getSessionHistory()
      .then((res) => {
        const today = new Date().toDateString();
        const todays = res.data.filter(
          (s: StudySession) =>
            s.completed && new Date(s.started_at).toDateString() === today,
        );
        setTodayStats({
          count: todays.length,
          minutes: todays.reduce((sum, s) => sum + s.actual_minutes, 0),
        });
      })
      .catch(() => {
        // Stats row just shows zeros — non-critical.
      });
  }, []);

  useEffect(() => {
    if (!session || isPaused) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startedAtMs - pauseAccumRef.current;
      setElapsedSeconds(Math.floor(elapsedMs / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session, isPaused, startedAtMs]);

  useEffect(() => {
    if (!audioRef.current || !session?.soundUrl) return;
    if (isPaused) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {
        // Autoplay can be blocked until a user gesture — the Play/Pause
        // button itself is a gesture, so this only matters on auto-start.
      });
    }
  }, [isPaused, session?.soundUrl]);

  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  async function finishAndNavigate(completed: boolean, actualMinutes: number) {
    if (!session || finishing) return;
    setFinishing(true);
    try {
      await finishSession(session.sessionId, actualMinutes, completed);
    } catch {
      // Even if the finish call fails, don't strand the student on a dead
      // timer screen — the session row just stays "in progress"
      // (actual_minutes: 0, completed: false) server-side, an honest gap
      // rather than a crash.
    }
    setSession(null);
    navigate(completed ? "/study-with-me/break" : "/", { replace: true });
  }

  useEffect(() => {
    if (session && remainingSeconds === 0 && !finishing) {
      finishAndNavigate(true, session.plannedMinutes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, session, finishing]);

  function togglePause() {
    if (isPaused) {
      pauseAccumRef.current += Date.now() - (pausedAtRef.current ?? Date.now());
      pausedAtRef.current = null;
    } else {
      pausedAtRef.current = Date.now();
    }
    setIsPaused((prev) => !prev);
  }

  function handleGiveUp() {
    if (!session) return;
    const actualMinutes = Math.round(elapsedSeconds / 60);
    finishAndNavigate(false, actualMinutes);
  }

  if (!session) {
    return <Navigate to="/study-with-me" replace />;
  }

  return (
    <AppShell background="bg-brand-950">
      <GradientBackdrop variant="dark" />
      <div className="relative z-10 px-5 pt-6 pb-10 text-white lg:mx-auto lg:max-w-xl lg:px-0 lg:pt-10">
      {session.soundUrl && (
        <audio ref={audioRef} src={session.soundUrl} loop autoPlay />
      )}

      <div className="mb-8 text-center">
        <HeadphonesIcon className="mx-auto mb-2 h-6 w-6 text-brand-200" />
        <h1 className="text-lg font-semibold">Focus Session</h1>
        <p className="text-sm text-brand-200">You can do this! ❤️</p>
      </div>

      <div className="mb-8 flex justify-center">
        <CircularTimer
          totalSeconds={totalSeconds}
          remainingSeconds={remainingSeconds}
          label="Focus Time"
          variant="dark"
        />
      </div>

      <div className="mb-8 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={togglePause}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-400 text-brand-950 shadow-theme-md"
          aria-label={isPaused ? "Resume" : "Pause"}
        >
          {isPaused ? <PlayIcon className="h-6 w-6" /> : <PauseIcon className="h-6 w-6" />}
        </button>
        {session.soundName && (
          <p className="flex items-center gap-1.5 text-xs text-brand-200">
            <HeadphonesIcon className="h-3.5 w-3.5" />
            {session.soundName}
          </p>
        )}
      </div>

      <div className="mb-6 flex justify-center gap-8 text-center">
        <div>
          <p className="text-lg font-semibold">{todayStats.count}</p>
          <p className="text-[11px] text-brand-200">Sessions Today</p>
        </div>
        <div>
          <p className="text-lg font-semibold">
            {Math.floor(todayStats.minutes / 60)}h {todayStats.minutes % 60}m
          </p>
          <p className="text-[11px] text-brand-200">Total Time</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-white/10 p-4 text-center">
        <p className="text-sm font-semibold">{QUOTE.line}</p>
        <p className="mt-0.5 text-xs text-brand-200">{QUOTE.sub}</p>
      </div>

      <button
        type="button"
        onClick={handleGiveUp}
        disabled={finishing}
        className="mx-auto block text-xs font-medium text-brand-200 underline disabled:opacity-50"
      >
        End session early
      </button>
      </div>
    </AppShell>
  );
}
