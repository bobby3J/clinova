import { Link, useLocation } from "react-router";

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
};

const MobileBottomNav = ({ items }: { items: NavItem[] }) => {
  const location = useLocation();

  const mainItems = items.slice(0, 5);
  const isItemActive = (item: NavItem) =>
    location.pathname === item.path ||
    item.subItems?.some((subItem) => location.pathname === subItem.path);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 h-16 flex justify-around items-center z-50">
      {mainItems.map((item) => {
        return (
          <Link
            key={item.name}
            to={item.path || "/"}
            className={`flex flex-col items-center text-xs ${
              isItemActive(item) ? "text-brand-500" : "text-gray-500"
            }`}
          >
            <span className="w-5 h-5">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
};

export default MobileBottomNav;
