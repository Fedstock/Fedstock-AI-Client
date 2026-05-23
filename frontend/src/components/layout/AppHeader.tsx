import type { DashboardData, PageDefinition, PageId } from "../../types/dashboard";
import { cn } from "../../lib/utils";

type AppHeaderProps = {
  pages: PageDefinition[];
  activePage: PageId;
  dataSource: DashboardData["source"];
  summary?: string;
  isGlass?: boolean;
};

export function AppHeader({ pages, activePage, dataSource, summary, isGlass = false }: AppHeaderProps) {
  const page = pages.find((item) => item.id === activePage) ?? pages[0];
  
  return (
    <header className="sticky top-0 z-30 shrink-0 px-6 pb-10 pt-11 sm:px-8 lg:px-10 xl:px-12">
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 z-0 transition-all duration-200",
          !isGlass && "bg-slate-50", 
          isGlass && "bg-linear-to-b from-white/30 to-white/5 backdrop-blur-2xl"
        )}
      />
      
      <div className="relative z-10 mx-auto flex w-full max-w-[1500px] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950">{page.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{summary ?? page.subtitle}</p>
        </div>
      </div>
    </header>
  );
}
