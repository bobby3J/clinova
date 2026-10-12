import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import { getNotifications, markAllNotificationsRead } from "../lib/notifications";
import { BellIcon } from "./icons";
import type { AppNotification } from "../types/notifications";

/**
 * A real unread count (badge number), not admin's NotificationDropdown
 * pulsing-dot-on-any-items treatment — that dropdown is also static
 * preview data with no backend behind it (see its own top comment); this
 * one is wired to the real GET /notifications endpoint. Opening the panel
 * marks everything read, same "opening it clears the badge" convention
 * every real notification UI uses.
 */
export default function NotificationBell() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getNotifications()
      .then((res) => {
        setNotifications(res.data);
        setUnreadCount(res.meta.unread_count);
      })
      .catch(() => {
        // Badge just stays at 0 — not worth a visible error state for this.
      });
  }, []);

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

  function handleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && unreadCount > 0) {
      markAllNotificationsRead()
        .then(() => setUnreadCount(0))
        .catch(() => {
          // Badge just stays as-is — the student can still read the list.
        });
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-50"
        aria-label="Notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-72 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-theme-md">
          <p className="px-3 py-2 text-sm font-semibold text-gray-800">
            Notifications
          </p>
          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-gray-400">
              Nothing yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {notifications.map((n) => (
                <li key={n.id} className="rounded-lg px-3 py-2 hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
