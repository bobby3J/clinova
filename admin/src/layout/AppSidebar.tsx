import { useCallback } from "react";
import { Link, useLocation } from "react-router";
import {
  AudioIcon,
  ChatIcon,
  CopyIcon,
  FolderIcon,
  GearIcon,
  GridIcon,
  GroupIcon,
  HorizontaLDots,
  PaperPlaneIcon,
  TimeIcon,
  UserCircleIcon,
} from "../icons";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { isAdmin, isLecturer, type AuthUser } from "../types/auth";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path: string;
  // Omitted entirely = visible to any role AuthGate lets into the console
  // (admin or lecturer). Present = visible only to the listed role(s).
  roles?: ("admin" | "lecturer")[];
};

/**
 * Three tiers as of 2026-10-06 (student/admin/lecturer), not the flat
 * admin-only list this used to be — AuthGate now lets lecturers in too,
 * so the nav itself has to say which items are admin-only. Items with no
 * `roles` (Study Library, Flashcards, Settings) are the ones lecturers
 * and admins both get full parity on.
 */
export const navItems: NavItem[] = [
  { icon: <GridIcon />, name: "Overview", path: "/", roles: ["admin"] },
  { icon: <FolderIcon />, name: "Study Library", path: "/study-library" },
  { icon: <CopyIcon />, name: "Flashcards", path: "/flashcards" },
  { icon: <AudioIcon />, name: "Sound Library", path: "/sounds", roles: ["admin"] },
  { icon: <GroupIcon />, name: "Users", path: "/users", roles: ["admin"] },
  { icon: <UserCircleIcon />, name: "Lecturers", path: "/lecturers", roles: ["admin"] },
  { icon: <PaperPlaneIcon />, name: "Announcements", path: "/announcements", roles: ["admin"] },
  { icon: <ChatIcon />, name: "Support", path: "/support", roles: ["admin"] },
  { icon: <TimeIcon />, name: "Activity Log", path: "/activity-log", roles: ["admin"] },
  { icon: <GearIcon />, name: "Settings", path: "/settings" },
];

/**
 * The one place role-based nav filtering happens — AppSidebar is the
 * only nav surface now (mobile used to have a separate bottom nav that
 * silently truncated to 5 items, hiding half the admin sections; removed
 * in favor of this same drawer on every screen size, opened via
 * AppHeader's hamburger, which is no longer hidden below `lg`).
 */
export function getVisibleNavItems(user: AuthUser | null): NavItem[] {
  return navItems.filter((item) => {
    if (!item.roles) return true;
    if (item.roles.includes("admin") && isAdmin(user)) return true;
    if (item.roles.includes("lecturer") && isLecturer(user)) return true;
    return false;
  });
}

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered, toggleMobileSidebar } =
    useSidebar();
  const location = useLocation();
  const { user } = useAuth();
  const visibleNavItems = getVisibleNavItems(user);

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-500 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isMobileOpen && (
        <div
          className={`py-2 flex ${
            !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
          }`}
        >
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/images/logo/clinova-mark.svg"
              alt="Clinova"
              width={isExpanded || isHovered || isMobileOpen ? 34 : 40}
              height={isExpanded || isHovered || isMobileOpen ? 34 : 40}
            />
            {(isExpanded || isHovered || isMobileOpen) && (
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Clinova
              </span>
            )}
          </Link>
        </div>
      )}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              {/* No section label here — "Admin Console" read as redundant
                  filler once the sidebar already only ever shows admins a
                  single flat list (see the comment on navItems above).
                  Collapsed state still needs *something* in this row so the
                  dot icon doesn't jump the layout when expanding/collapsing. */}
              <h2
                className={`mb-4 flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered
                    ? "lg:justify-center"
                    : "justify-start"
                }`}
              >
                {!isExpanded && !isHovered && !isMobileOpen && (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              <ul className="flex flex-col gap-4">
                {visibleNavItems.map((nav) => (
                  <li key={nav.name}>
                    <Link
                      to={nav.path}
                      onClick={() => isMobileOpen && toggleMobileSidebar()}
                      className={`menu-item group ${
                        isActive(nav.path)
                          ? "menu-item-active"
                          : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={`menu-item-icon-size ${
                          isActive(nav.path)
                            ? "menu-item-icon-active"
                            : "menu-item-icon-inactive"
                        }`}
                      >
                        {nav.icon}
                      </span>
                      {(isExpanded || isHovered || isMobileOpen) && (
                        <span className="menu-item-text">{nav.name}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;
