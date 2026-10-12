import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

/**
 * Same shape as admin's UserDropdown.tsx (toggle button + closes on route
 * change + a real click-outside dismiss) but self-contained — this app
 * doesn't have admin's generic Dropdown/DropdownItem UI components, and a
 * one-off menu like this doesn't need them.
 */
type Props = {
  /** Compact form for the mobile top bar — just the initial, no name text. */
  avatarOnly?: boolean;
};

export default function ProfileMenu({ avatarOnly = false }: Props) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setIsOpen(false);
    await logout();
    navigate("/signin", { replace: true });
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-full"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-600">
          {initial}
        </span>
        {!avatarOnly && (
          <span className="text-sm font-medium text-gray-600">{user?.name}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-gray-100 bg-white p-2 shadow-theme-md">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="mt-1 block rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Profile
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
