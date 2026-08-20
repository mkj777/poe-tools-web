"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Swords } from "lucide-react";
import { LeagueSelect } from "@/components/league-select";
import { TOOLS, activeTool, swapLeague, toolHref } from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";
import { cn } from "@/lib/utils";

/**
 * One bar over every tool. The league select stays on the right and keeps
 * whichever tool is open, so switching league never also switches page.
 */
export function SiteNav({
  leagues,
  league,
}: {
  leagues: League[];
  league: string;
}) {
  const pathname = usePathname() ?? "";
  const current = activeTool(pathname);
  const slug = leagueSlug(league);

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center gap-6 px-6">
        <span className="text-foreground flex items-center gap-2 text-sm font-semibold">
          <Swords className="size-4" />
          PoE Tools
        </span>

        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={toolHref(slug, tool.slug)}
              aria-current={tool.slug === current ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tool.slug === current
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              {tool.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto">
          <LeagueSelect
            leagues={leagues}
            value={league}
            className="w-[180px]"
            to={(next) => swapLeague(pathname, next)}
          />
        </div>
      </nav>
    </header>
  );
}
