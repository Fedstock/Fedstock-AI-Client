import { LuMenu } from "react-icons/lu";
import type { PageDefinition, PageId } from "../../types/dashboard";
import { cn } from "../../lib/utils";

type AppSidebarProps = {
  pages: PageDefinition[];
  activePage: PageId;
  onPageChange: (page: PageId) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

export function AppSidebar({
  pages,
  activePage,
  onPageChange,
  isCollapsed,
  onToggleCollapsed,
}: AppSidebarProps) {
  return (
    <aside
      className="hidden h-screen shrink-0 overflow-hidden border-r border-gray-100 bg-white px-4 py-8 transition-all duration-300 lg:sticky lg:top-0 lg:flex lg:flex-col"
    >
      <div className="mb-8 flex">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          aria-expanded={!isCollapsed}
        >
          <LuMenu className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <nav className="space-y-1" aria-label="Dashboard pages">
        {pages.map((page) => {
          const Icon = page.icon;
          const isActive = page.id === activePage;
          return (
            <button
              key={page.id}
              type="button"
              title={isCollapsed ? page.label : undefined}
              aria-label={page.label}
              className={cn(
                "flex h-12 w-full items-center overflow-hidden rounded-2xl text-left text-sm transition-[background-color,color] duration-300",
                isActive
                  ? "bg-gray-100 font-semibold text-gray-900"
                  : "font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900",
              )}
              onClick={() => onPageChange(page.id)}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-gray-900" : "text-gray-400")} aria-hidden="true" />
              </span>
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity,transform] duration-200 ease-out",
                  isCollapsed
                    ? "ml-0 max-w-0 -translate-x-1 opacity-0 delay-0"
                    : "ml-3 max-w-[120px] translate-x-0 opacity-100 delay-150",
                )}
              >
                {page.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-auto pt-6">
        <div
          className={cn(
            "flex items-center overflow-hidden rounded-3xl bg-gray-50 transition-all duration-300",
            isCollapsed ? "h-10 w-10 justify-center p-0" : "w-full gap-3 p-3",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 text-sm font-bold text-white shadow-[0_10px_24px_rgba(59,130,246,0.22)]">
            GS
          </div>
          <div
            className={cn(
              "min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-200 ease-out",
              isCollapsed ? "max-w-0 -translate-x-1 opacity-0 delay-0" : "max-w-[132px] translate-x-0 opacity-100 delay-150",
            )}
          >
            <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Gachon Store</p>
            <p className="truncate text-xs text-slate-400">Store Manager</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
