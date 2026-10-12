import { useSidebar } from "../context/SidebarContext";
import { PanelToggleIcon } from "./icons";
import ProfileMenu from "./ProfileMenu";
import NotificationBell from "./NotificationBell";

/**
 * Desktop-only (hidden lg:flex) — admin's AppHeader also shows a mobile
 * logo row at <lg, but this app's mobile screens already render their own
 * header content per-page (Home's logo block, SessionSetup's back
 * button), so there's nothing for this component to add on mobile; it
 * simply doesn't render there (MobileTopBar.tsx is the <lg equivalent of
 * the right-side icons specifically).
 */
export default function Header() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-40 hidden w-full border-b border-gray-200 bg-white lg:flex">
      <div className="flex w-full items-center justify-between px-6 py-3">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <PanelToggleIcon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-4">
          <NotificationBell />
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
