import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import MobileBottomNav from "../components/MobileBottomNav";
import { getVisibleNavItems } from "./AppSidebar";
import { useAuth } from "../context/AuthContext";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  // Filtered the same way AppSidebar filters its own list, then sliced —
  // slicing the raw navItems first would leak admin-only items into a
  // lecturer's first-5 mobile bottom bar.
  const { user } = useAuth();
  const visibleNavItems = getVisibleNavItems(user);

  return (
    <>
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="mx-auto max-w-(--breakpoint-2xl) p-4 pb-24 md:p-6 md:pb-6">
          <Outlet />
        </div>
      </div>
    </div>

    <MobileBottomNav items={visibleNavItems}/>
    </>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
