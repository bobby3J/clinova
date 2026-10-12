import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { Dropdown } from "../ui/dropdown/Dropdown";

type PreviewAlert = {
  id: number;
  title: string;
  message: string;
  time: string;
};

/**
 * There's no backend domain for admin-facing alerts yet (no student
 * feedback inbox, no generic "admin alert" events) — just the existing
 * Activity Log, which already records real admin-relevant events
 * (AdminActionPerformed etc. — see api/docs/ARCHITECTURE.md). These three
 * rows are static layout previews (dismissible, but not persisted or
 * fetched from anywhere) so the dropdown's real shape is visible before
 * that domain exists — swap this array + its dismiss handler for a real
 * fetch once one does. "View Activity Log" goes to the real /activity-log
 * route instead of a /notifications page that doesn't exist.
 *
 * The pulsing dot on the bell is driven by `alerts.length > 0` — once this
 * is wired to a real feed (polling or a websocket/broadcast channel), that
 * should become an actual unread count rather than "any items present."
 */
const PREVIEW_ALERTS: PreviewAlert[] = [
  {
    id: 1,
    title: "New student signup",
    message: "A new account was created and may want a welcome check-in.",
    time: "2 hr ago",
  },
  {
    id: 2,
    title: "Flagged content reported",
    message: "A study material was flagged and is waiting on review.",
    time: "5 hr ago",
  },
  {
    id: 3,
    title: "Account appeal submitted",
    message: "A suspended user requested their account be reactivated.",
    time: "1 day ago",
  },
];

export default function NotificationDropdown() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [alerts, setAlerts] = useState(PREVIEW_ALERTS);

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  function dismissAlert(id: number) {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative">
      <button
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
        aria-label="Open notifications"
      >
        {alerts.length > 0 && (
          <span className="absolute right-0 top-0.5 z-10 flex h-2 w-2 rounded-full bg-orange-400">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="fixed left-1/2 top-[4.75rem] z-99999 mt-0 flex h-[480px] max-h-[calc(100vh-10rem)] w-[calc(100vw-1rem)] max-w-[361px] -translate-x-1/2 flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark lg:absolute lg:left-auto lg:right-0 lg:top-auto lg:z-40 lg:mt-[17px] lg:w-[361px] lg:max-w-none lg:translate-x-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notifications
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Close notifications"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No alerts yet
              </p>
              <p className="text-xs text-gray-400">
                Admin-facing alerts aren't built yet — this will surface
                things like flagged content or account appeals once that
                domain exists.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-1">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border-b border-gray-100 p-3 dark:border-gray-800"
                >
                  <span className="block min-w-0 flex-1">
                    <span className="block text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {alert.title}
                    </span>
                    <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
                      {alert.message}
                    </span>
                    <span className="mt-1.5 block text-gray-400 text-theme-xs">
                      {alert.time}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissAlert(alert.id)}
                    aria-label={`Dismiss "${alert.title}"`}
                    className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                  >
                    <svg
                      className="fill-current"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link
          to="/activity-log"
          onClick={closeDropdown}
          className="block shrink-0 px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          View Activity Log
        </Link>
      </Dropdown>
    </div>
  );
}
