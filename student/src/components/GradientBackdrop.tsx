/**
 * Decorative, fully inert backdrop — fixed behind whatever page mounts it
 * (StudyWithMe's SessionSetup and ActiveSession screens). Each blob drifts
 * on its own independently-timed loop (see index.css's blob-drift-*
 * keyframes) and the whole group's actual color cycles via hue-cycle on
 * top of that, so it reads as continuously changing, not one static
 * two-color gradient. pointer-events-none + negative z-index so it never
 * intercepts clicks or sits above real content — the page using this must
 * give its own content wrapper `relative z-10` (or any positive z-index)
 * for that ordering to hold reliably.
 *
 * `variant="dark"` (ActiveSession, over bg-brand-950) switches to higher
 * opacity + `mix-blend-screen` so the colors actually glow against a
 * near-black base — the `normal` blend that looks right as a soft wash
 * over SessionSetup's light bg-gray-50 would just look muddy on dark.
 *
 * Every class below is a complete, static string literal (never built via
 * `${}` interpolation) — Tailwind's build-time scanner only picks up
 * classes it can find as literal text in source, so an interpolated
 * fragment like `` `bg-brand-400${opacity}` `` silently never generates
 * any CSS for the result and the blob renders with no color at all.
 *
 * z-0, not a negative z-index: `position: fixed` always creates its own
 * stacking context regardless of z-index, so a negative value here gets
 * compared at the document root level — where it loses to EVERY ordinary
 * (non-positioned) element in the whole page, including AppShell's own
 * solid background div, no matter how deeply either one is nested. That
 * made the backdrop fully invisible, confirmed live. z-0 puts it in the
 * correct paint layer: above ordinary content (so it's visible over
 * AppShell's background) but below the page content, which uses z-10.
 */
export default function GradientBackdrop({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const isDark = variant === "dark";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="gradient-backdrop absolute inset-0">
        <div
          className={
            isDark
              ? "gradient-backdrop-blob-a absolute -left-16 top-0 h-80 w-80 rounded-full bg-brand-400/70 blur-[90px] mix-blend-screen"
              : "gradient-backdrop-blob-a absolute -left-16 top-0 h-80 w-80 rounded-full bg-brand-400/40 blur-[90px]"
          }
        />
        <div
          className={
            isDark
              ? "gradient-backdrop-blob-b absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-400/60 blur-[100px] mix-blend-screen"
              : "gradient-backdrop-blob-b absolute right-0 top-1/4 h-96 w-96 rounded-full bg-violet-400/35 blur-[100px]"
          }
        />
        <div
          className={
            isDark
              ? "gradient-backdrop-blob-c absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/60 blur-[90px] mix-blend-screen"
              : "gradient-backdrop-blob-c absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-300/35 blur-[90px]"
          }
        />
        <div
          className={
            isDark
              ? "gradient-backdrop-blob-d absolute bottom-10 right-10 h-64 w-64 rounded-full bg-success-400/55 blur-[90px] mix-blend-screen"
              : "gradient-backdrop-blob-d absolute bottom-10 right-10 h-64 w-64 rounded-full bg-success-400/30 blur-[90px]"
          }
        />
      </div>
    </div>
  );
}
