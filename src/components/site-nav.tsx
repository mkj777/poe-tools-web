"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChevronDown, Swords } from "lucide-react";
import { LeagueSelect } from "@/components/league-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TOOLS, activeTool, swapLeague, toolHref } from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";
import { EXTERNAL_TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

const tab =
  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary/50";

/**
 * One bar over every tool. The league select stays on the right and keeps
 * whichever tool is open, so switching league never also switches page. The
 * Tools menu holds the sites that already do a job better than this one could,
 * and hands the two that care which league you are looking at.
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
                tab,
                tool.slug === current &&
                  "bg-secondary text-foreground hover:bg-secondary",
              )}
            >
              {tool.label}
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger className={cn(tab, "flex items-center gap-1")}>
              Tools
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              {EXTERNAL_TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.name} asChild>
                  <a
                    href={tool.href(league)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex cursor-pointer items-start gap-2"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {tool.name}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {tool.blurb}
                      </span>
                    </span>
                    <ArrowUpRight className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
                  </a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
