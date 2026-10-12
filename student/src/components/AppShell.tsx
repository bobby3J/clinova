import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useSidebar } from "../context/SidebarContext";

type Props = {
  children: ReactNode;
  /** Tailwind bg-* class(es) for the whole shell — each screen has its
   * own background (gray-50, the dark focus gradient, break-screen sage). */
  background?: string;
};

/**
 * Ported from admin/src/layout/AppLayout.tsx's structure exactly — same
 * sidebar-width-aware content margin (lg:ml-[290px]/[90px] depending on
 * isExpanded/isHovered), same Header, same content-wrapper convention
 * (mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6). Mobile (<lg) renders
 * none of this — no margin, no Header (hidden lg:flex), no outer padding
 * — so every mobile screen is pixel-identical to before this component
 * existed; each page keeps its own px-5-style padding for that case.
 */
export default function AppShell({ children, background = "bg-gray-50" }: Props) {
  const { isExpanded, isHovered } = useSidebar();

  return (
    <div className={`min-h-screen lg:flex ${background}`}>
      <Sidebar />
      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        }`}
      >
        <Header />
        <div className="lg:mx-auto lg:max-w-(--breakpoint-2xl) lg:p-6">{children}</div>
      </div>
    </div>
  );
}
