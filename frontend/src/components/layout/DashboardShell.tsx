import { useState, type ReactNode, type UIEvent } from "react";
import type { DashboardData, PageDefinition, PageId } from "../../types/dashboard";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";

type DashboardShellProps = {
  pages: PageDefinition[];
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  dataSource: DashboardData["source"];
  headerSummary?: string;
  children: ReactNode;
};

export function DashboardShell({
  pages,
  activePage,
  onPageChange,
  dataSource,
  headerSummary,
  children,
}: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHeaderGlass, setIsHeaderGlass] = useState(false);

  const handleMainScroll = (event: UIEvent<HTMLDivElement>) => {
    const nextIsHeaderGlass = event.currentTarget.scrollTop > 8;
    setIsHeaderGlass((current) => (current === nextIsHeaderGlass ? current : nextIsHeaderGlass));
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-[#111827]">
      <div
        className={`grid h-full transition-all duration-300 ${
          isCollapsed ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[224px_minmax(0,1fr)]"
        }`}
      >
        <AppSidebar
          pages={pages}
          activePage={activePage}
          onPageChange={onPageChange}
          isCollapsed={isCollapsed}
          onToggleCollapsed={() => setIsCollapsed((value) => !value)}
        />
        <div className="h-screen min-w-0 overflow-y-auto bg-slate-50" onScroll={handleMainScroll}>
          <AppHeader
            pages={pages}
            activePage={activePage}
            dataSource={dataSource}
            summary={headerSummary}
            isGlass={isHeaderGlass}
          />
          <div className="sticky top-[132px] z-20 shrink-0 bg-gradient-to-b from-slate-50/90 to-slate-50/0 px-6 pb-4 backdrop-blur-xl lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`shrink-0 rounded-full px-3 py-2 text-sm font-medium ${
                    page.id === activePage ? "bg-[#111827] text-white" : "bg-white text-[#6B7280]"
                  }`}
                  onClick={() => onPageChange(page.id)}
                >
                  {page.label}
                </button>
              ))}
            </div>
          </div>
          <main className="bg-slate-50 px-6 pb-10 pt-6 sm:px-8 lg:px-10 xl:px-12">
            <div className="page-enter mx-auto w-full max-w-[1500px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
