import { useEffect, useMemo, useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import { getActivityLog } from "../../lib/activityLog";
import {
  AlertIcon,
  BoltIcon,
  CheckCircleIcon,
  PaperPlaneIcon,
} from "../../icons";
import { ApiError, type ApiPaginatedResponse } from "../../types/common";
import type { AdminActivityLog } from "../../types/activityLog";

type ActionConfig = {
  label: string;
  icon: typeof BoltIcon;
  accent: "success" | "warning" | "brand" | "default";
};

/**
 * Every key here was confirmed by grepping `action: '...'` across
 * app/Domain, not guessed — see src/types/activityLog.ts's top comment.
 * `action` is free-text on the backend, so ACTION_CONFIG is deliberately
 * not exhaustive; FALLBACK_CONFIG + humanizeAction() handle anything not
 * listed here, which matters because new Action classes will add new
 * strings over time without this file being updated in lockstep.
 */
const ACTION_CONFIG: Record<string, ActionConfig> = {
  published_study_material: {
    label: "Published study material",
    icon: CheckCircleIcon,
    accent: "success",
  },
  published_flashcard_deck: {
    label: "Published flashcard deck",
    icon: CheckCircleIcon,
    accent: "success",
  },
  suspended_user: {
    label: "Suspended user",
    icon: AlertIcon,
    accent: "warning",
  },
  reactivated_user: {
    label: "Reactivated user",
    icon: CheckCircleIcon,
    accent: "success",
  },
  broadcast_announcement: {
    label: "Broadcast announcement",
    icon: PaperPlaneIcon,
    accent: "brand",
  },
};

const FALLBACK_CONFIG: ActionConfig = {
  label: "",
  icon: BoltIcon,
  accent: "default",
};

const ACCENT_CLASSES: Record<ActionConfig["accent"], string> = {
  success:
    "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500",
  warning:
    "bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400",
  brand: "bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400",
  default: "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
};

function humanizeAction(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function ActivityLog() {
  const [entries, setEntries] = useState<AdminActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<
    ApiPaginatedResponse<AdminActivityLog>["meta"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getActivityLog(page)
      .then((res) => {
        if (cancelled) return;
        setEntries(res.data);
        setMeta(res.meta);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load the activity log. Check your connection and try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, reloadToken]);

  // Built from `entries` — the current page only — so these filter pills
  // only ever show action types that happened to land on this page. An
  // action type used once, months ago, won't show a pill until you're on
  // the page containing it. Same "filters only see one page" tradeoff as
  // the Users page; see its comment and REACT_REENTRY_API_GUIDE.md §4b.
  const actionTypes = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries],
  );

  const isFiltering = actionFilter !== "all" || search.trim() !== "";

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (actionFilter !== "all" && entry.action !== actionFilter) {
        return false;
      }
      if (
        query &&
        !(entry.description ?? "").toLowerCase().includes(query) &&
        !(entry.admin_name ?? "").toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [entries, actionFilter, search]);

  return (
    <>
      <PageMeta
        title="Activity Log | Clinova Admin"
        description="Every logged admin action."
      />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          Activity Log
        </h1>
        <p className="mt-1 max-w-xl text-sm text-gray-500 dark:text-gray-400">
          Every logged admin action — publishing content, suspending a user,
          broadcasting an announcement — written automatically via a shared
          event, not by each feature remembering to log itself.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            label="All"
            active={actionFilter === "all"}
            onClick={() => setActionFilter("all")}
          />
          {actionTypes.map((action) => (
            <FilterPill
              key={action}
              label={ACTION_CONFIG[action]?.label ?? humanizeAction(action)}
              active={actionFilter === action}
              onClick={() => setActionFilter(action)}
            />
          ))}
        </div>
        <div className="flex flex-col sm:items-end">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search description or admin…"
            className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 sm:w-64"
          />
          {isFiltering && meta && meta.last_page > 1 && (
            <p className="mt-1 text-xs text-gray-400">
              Filtering this page only — browse other pages to find older
              entries.
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-start gap-2 rounded-2xl border border-dashed border-error-200 p-5 dark:border-error-500/30">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          <button
            type="button"
            onClick={() => setReloadToken((n) => n + 1)}
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Try again
          </button>
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {entries.length === 0
              ? "No activity yet"
              : "No entries on this page match your filters"}
          </p>
          <p className="text-xs text-gray-400">
            {entries.length === 0
              ? "Admin actions will show up here as they happen."
              : "Try a different action type, search term, or page."}
          </p>
        </div>
      ) : (
        <>
        <ul className="flex flex-col gap-3">
          {visibleEntries.map((entry) => {
            const config = ACTION_CONFIG[entry.action] ?? {
              ...FALLBACK_CONFIG,
              label: humanizeAction(entry.action),
            };
            const Icon = config.icon;
            return (
              <li
                key={entry.id}
                className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[config.accent]}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-medium text-gray-800 dark:text-white/90">
                      {entry.description ?? config.label}
                    </p>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(entry.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {entry.admin_name ?? "Unknown admin"} · {config.label}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        {meta && meta.last_page > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Page {meta.current_page} of {meta.last_page} •{" "}
              {meta.total} entr{meta.total === 1 ? "y" : "ies"} total
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5"
              >
                Next
              </button>
            </div>
          </div>
        )}
        </>
      )}
    </>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-brand-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}
