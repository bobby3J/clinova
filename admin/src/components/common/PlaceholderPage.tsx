import PageMeta from "./PageMeta";

/**
 * Every Clinova admin section starts life as one of these — correctly
 * routed, correctly named, nothing faked. The next phase (writing UI and
 * wiring APIs, per the prep-work plan this was built under) replaces each
 * one individually; this component's job is to make that boundary obvious
 * rather than leaving a page that *looks* finished but silently does
 * nothing.
 */
export default function PlaceholderPage({
  title,
  description,
  endpoint,
}: {
  title: string;
  description: string;
  /** e.g. "GET /admin/users" — shown so it's obvious at a glance which
   * api/docs/API_REFERENCE.md entry this page is waiting to be wired to. */
  endpoint?: string;
}) {
  return (
    <>
      <PageMeta title={`${title} | Clinova Admin`} description={description} />
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
        {endpoint && (
          <p className="mt-4 inline-block max-w-full rounded-md bg-gray-100 px-3 py-1.5 font-mono text-xs break-words text-gray-600 dark:bg-white/[0.05] dark:text-gray-400">
            {endpoint}
          </p>
        )}
      </div>
    </>
  );
}
