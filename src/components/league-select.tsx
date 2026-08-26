"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { swapLeague } from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";

/**
 * Which league the prices under it are read from. It sits here rather than in
 * the bar because it is not a place in the site and not a setting every page
 * has: the map regex is the same in every league, and so is the leveling app.
 *
 * The entries are links, so a switch is a navigation to a page that is already
 * built rather than a state change nothing was rendered for.
 */
export function LeagueSelect({
  leagues,
  league,
}: {
  leagues: League[];
  league: string;
}) {
  const pathname = usePathname() ?? "";
  const current = leagues.find((l) => l.id === league)?.name ?? league;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-card hover:bg-secondary/40 data-[state=open]:bg-secondary/40 flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors outline-none">
        {current}
        <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {leagues.map((l) => (
          <DropdownMenuItem key={l.id} asChild>
            <Link
              href={swapLeague(pathname, leagueSlug(l.id))}
              aria-current={l.id === league ? "page" : undefined}
              className="flex cursor-pointer items-center gap-2"
            >
              <span className="flex-1 text-sm">{l.name}</span>
              {l.id === league && (
                <Check className="text-muted-foreground size-3.5 shrink-0" />
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
