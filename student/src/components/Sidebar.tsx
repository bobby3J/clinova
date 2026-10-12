import { useCallback } from "react";
import { Link, useLocation } from "react-router";
import { useSidebar } from "../context/SidebarContext";
import { HorizontaLDots } from "./icons";
import { NAV_ITEMS } from "./navItems";

/**
 * Ported from admin/src/layout/AppSidebar.tsx — same width/collapse/hover
 * mechanic (290px expanded, 90px collapsed, hover-to-peek when collapsed),
 * same fixed/border/z-index treatment, same menu-item-* classes (see
 * index.css), not just a visually-similar approximation. Desktop (lg:+)
 * only in practice: isMobileOpen never becomes true in this app (nothing
 * triggers toggleMobileSidebar on small screens), so on mobile this stays
 * off-canvas (-translate-x-full) the entire time — BottomNav is the only
 * mobile nav, exactly as before this component existed.
 */
export default function Sidebar() {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const location = useLocation();

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname],
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
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
              <span className="text-xl font-bold text-gray-900">Clinova</span>
            )}
          </Link>
        </div>
      )}
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {!isExpanded && !isHovered && !isMobileOpen && (
                  <HorizontaLDots className="size-6" />
                )}
              </h2>
              <ul className="flex flex-col gap-4">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);

                  return (
                    <li key={item.key}>
                      <Link
                        to={item.path}
                        className={`menu-item group ${
                          active ? "menu-item-active" : "menu-item-inactive"
                        }`}
                      >
                        <span
                          className={`menu-item-icon-size ${
                            active ? "menu-item-icon-active" : "menu-item-icon-inactive"
                          }`}
                        >
                          <Icon />
                        </span>
                        {(isExpanded || isHovered || isMobileOpen) && (
                          <span className="menu-item-text">{item.label}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}
