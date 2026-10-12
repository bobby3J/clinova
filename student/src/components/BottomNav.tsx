import { Link, useLocation } from "react-router";
import { NAV_ITEMS } from "./navItems";

/**
 * Mobile only — Sidebar.tsx is the lg:+ equivalent. The two are a
 * standard show-one-hide-other responsive pair: this hides at lg,
 * Sidebar shows at lg.
 */
export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-gray-100 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <ul className="flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === location.pathname;
          return (
            <li key={item.key}>
              <Link
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-1 ${
                  isActive ? "text-brand-500" : "text-gray-400"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
