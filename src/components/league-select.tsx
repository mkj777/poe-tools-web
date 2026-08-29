"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { swapLeague } from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";

/**
 * Which league the prices on this page are read from.
 *
 * It sits on the page rather than in the chrome, because it is not a setting
 * the site has: the map mods are the same in every league, the leveling app has
 * never heard of one, and the tools still to come will each know for
 * themselves. A page that reads prices carries this beside them, and nothing
 * else has to pretend to have a league.
 *
 * The entries are links, so switching is a navigation to a page that already
 * exists rather than a state change nothing was rendered for.
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
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="bg-card h-10 min-w-40 justify-between font-medium sm:h-9"
        >
          <span className="truncate">{current}</span>
          <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
          <span className="sr-only">Change league</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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
