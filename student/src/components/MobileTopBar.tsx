import { Link } from "react-router";
import NotificationBell from "./NotificationBell";
import ProfileMenu from "./ProfileMenu";

/**
 * Mobile only (flex lg:hidden) — the <lg counterpart to Header.tsx's
 * right-side icons. Each page opts in explicitly (Home, SessionSetup,
 * Profile) rather than this being baked into AppShell unconditionally —
 * ActiveSession/BreakScreen also use AppShell (for the desktop sidebar)
 * but deliberately stay chrome-free on mobile (full-screen focus mode),
 * and a white icon bar stuck over their dark/full-bleed backgrounds would
 * clash with that on purpose, not just look different.
 */
export default function MobileTopBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-5 lg:hidden">
      <Link to="/" className="flex items-center gap-2">
        <img src="/images/logo/clinova-mark.svg" alt="Clinova" className="h-7 w-7" />
      </Link>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <ProfileMenu avatarOnly />
      </div>
    </div>
  );
}
