import { useSidebar } from "../context/SidebarContext";

/**
 * Always mounted now rather than conditionally rendered (`if
 * (!isMobileOpen) return null`) — that made it pop in/out instantly with
 * no transition at all, which read as jarring next to the sidebar's own
 * animated slide. Opacity + pointer-events transition instead, same
 * duration as AppSidebar's, so both animate together. pointer-events-none
 * while hidden keeps it from blocking clicks on the page underneath.
 */
const Backdrop: React.FC = () => {
  const { isMobileOpen, toggleMobileSidebar } = useSidebar();

  return (
    <div
      className={`fixed inset-0 z-40 bg-gray-900/50 lg:hidden transition-opacity duration-500 ease-in-out ${
        isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      onClick={toggleMobileSidebar}
    />
  );
};

export default Backdrop;
