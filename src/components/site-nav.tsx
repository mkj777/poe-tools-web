"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown } from "lucide-react";
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

/** What a tab and the menu beside it wear: part of the bar, not on top of it. */
const trigger =
  "text-muted-foreground hover:text-foreground hover:bg-secondary/50 data-[state=open]:bg-secondary data-[state=open]:text-foreground flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none";

/**
 * The league is not a place in the site, it is the setting everything else is
 * read against, so it wears the outlined pill the page uses for its own
 * settings rather than the flat look of the tabs.
 */
const leagueTrigger =
  "border-border/80 text-foreground hover:border-foreground/40 hover:bg-secondary/40 data-[state=open]:border-foreground/40 data-[state=open]:bg-secondary/60 flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors outline-none";

/** One line of either menu. Internal entries route, external ones open a tab. */
type Entry = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  current?: boolean;
};

/** How long the menu survives the pointer crossing the gap below the label. */
const CLOSE_DELAY = 140;

/**
 * A label that opens its list on hover, and still opens on click and on the
 * keyboard. Radix has no hover mode, so the open state lives here: the trigger
 * and the list share it, and closing waits a moment so the pointer can travel
 * from one to the other without the menu vanishing under it.
 */
function HoverMenu({
  label,
  entries,
  align,
  width,
  className = trigger,
}: {
  label: string;
  entries: Entry[];
  align: "start" | "end";
  width: string;
  /** What the label itself wears. Defaults to the look of the tabs. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (closing.current) clearTimeout(closing.current);
    setOpen(true);
  };
  const hide = () => {
    if (closing.current) clearTimeout(closing.current);
    closing.current = setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger
        className={className}
        onPointerEnter={show}
        onPointerLeave={hide}
      >
        {label}
        <ChevronDown
          className={cn("size-3.5 transition-transform", open && "rotate-180")}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={4}
        className={width}
        onPointerEnter={show}
        onPointerLeave={hide}
        // Hovering away should leave the page where it was, not jump focus
        // back to a label the pointer has already left.
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {entries.map((entry) => (
          <DropdownMenuItem key={entry.key} asChild>
            {entry.external ? (
              <a
                href={entry.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center gap-2"
              >
                <span className="flex-1 text-sm">{entry.label}</span>
                <ArrowUpRight className="text-muted-foreground size-3.5 shrink-0" />
              </a>
            ) : (
              <Link
                href={entry.href}
                aria-current={entry.current ? "page" : undefined}
                className="flex cursor-pointer items-center gap-2"
              >
                <span className="flex-1 text-sm">{entry.label}</span>
                {entry.current && (
                  <Check className="text-muted-foreground size-3.5 shrink-0" />
                )}
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * One bar over every page. More Tools on the left holds the sites that already
 * do a job better than this one could, and hands the two that care which league
 * you are looking at. The league menu on the right keeps whichever tool is open, so
 * switching league never also switches page.
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

  const tools: Entry[] = EXTERNAL_TOOLS.map((tool) => ({
    key: tool.name,
    label: tool.name,
    href: tool.href(league),
    external: true,
  }));

  const leagueEntries: Entry[] = leagues.map((l) => ({
    key: l.id,
    label: l.name,
    href: swapLeague(pathname, leagueSlug(l.id)),
    current: l.id === league,
  }));

  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <nav className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-6">
        <div className="flex items-center gap-1">
          {TOOLS.map((tool) => (
            <Link
              key={tool.slug}
              href={toolHref(slug, tool.slug)}
              aria-current={tool.slug === current ? "page" : undefined}
              className={cn(
                trigger,
                tool.slug === current &&
                  "bg-secondary text-foreground hover:bg-secondary",
              )}
            >
              {/* The label already names the tool, so the icon is decoration
                  and stays out of the accessible name. It dims with the tab
                  it sits in, which is what makes the current one read as
                  lit rather than merely shaded. */}
              <Image
                src={tool.icon.src}
                alt={tool.icon.alt}
                width={20}
                height={20}
                className={cn(
                  "shrink-0 transition-opacity",
                  tool.slug === current ? "opacity-100" : "opacity-75",
                )}
              />
              {tool.label}
            </Link>
          ))}

          <HoverMenu
            label="More Tools"
            entries={tools}
            align="start"
            width="w-52"
          />
        </div>

        <div className="ml-auto">
          <HoverMenu
            label={leagues.find((l) => l.id === league)?.name ?? league}
            entries={leagueEntries}
            align="end"
            width="w-56"
            className={leagueTrigger}
          />
        </div>
      </nav>
    </header>
  );
}
