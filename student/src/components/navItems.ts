import { HomeIcon, HeadphonesIcon, ChartIcon, UserIcon } from "./icons";

/**
 * Shared by BottomNav (mobile) and Sidebar (desktop) — one list, two
 * renderings, same lesson admin's getVisibleNavItems() already applies:
 * define the nav once, don't let each consumer maintain its own copy.
 * All four are real destinations now.
 */
export const NAV_ITEMS = [
  { key: "home", label: "Home", icon: HomeIcon, path: "/" },
  { key: "study", label: "Study", icon: HeadphonesIcon, path: "/study-with-me" },
  { key: "progress", label: "Progress", icon: ChartIcon, path: "/progress" },
  { key: "profile", label: "Profile", icon: UserIcon, path: "/profile" },
] as const;
