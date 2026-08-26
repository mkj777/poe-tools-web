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
import { TOOLS, activeTool, toolHref } from "@/lib/nav";
import { leagueSlug } from "@/lib/ninja";
import { EXTERNAL_TOOLS, PINNED_TOOLS } from "@/lib/tools";
import { cn } from "@/lib/utils";

/** What a tab and the menu beside it wear: part of the bar, not on top of it. */
const trigger =
  "text-muted-foreground hover:text-foreground hover:bg-secondary/50 data-[state=open]:bg-secondary data-[state=open]:text-foreground flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none";

/** One line of either menu. Internal entries route, external ones open a tab. */
type Entry = {
  key: string;
  label: string;
  href: string;
  external?: boolean;
  current?: boolean;
  /**
   * Already in the bar on a wide window, so the menu only carries it once the
   * bar has no room to. Which is why the menu holds every tool and hides the
   * pinned ones by breakpoint, rather than the bar and the menu splitting the
   * list between them and leaving three tools unreachable on a phone.
   */
  narrowOnly?: boolean;
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
          <DropdownMenuItem
            key={entry.key}
            asChild
            className={cn(entry.narrowOnly && "md:hidden")}
          >
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
 * One bar over every page. The tools of this site come first, then the sites
 * that already do a job better than this one could: the three reached for
 * directly sit in the bar under their own logos, and More Tools holds the ones
 * you go to with a question, handing the two that care which league you are
 * looking at.
 */
export function SiteNav({ league }: { league: string }) {
  const pathname = usePathname() ?? "";
  const current = activeTool(pathname);
  const slug = leagueSlug(league);

  // Every tool, in the order the list declares them, so the menu reads the same
  // whether or not the window is wide enough to have lifted three into the bar.
  const tools: Entry[] = EXTERNAL_TOOLS.map((tool) => ({
    key: tool.name,
    label: tool.name,
    href: tool.href(league),
    external: true,
    narrowOnly: tool.pinned,
  }));

  return (
    <header className="border-border/60 bg-card/90 sticky top-0 z-50 border-b backdrop-blur">
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
                  tool.icon.rounded && "rounded",
                  tool.slug === current ? "opacity-100" : "opacity-75",
                )}
              />
              {tool.label}
            </Link>
          ))}

          {/* Everything to the right of this leaves the site. The rule says so
              before the arrows do, and it is what keeps a tab of this site and
              a link to someone else's from reading as the same kind of thing. */}
          <span
            aria-hidden
            className="bg-border/70 mx-1 hidden h-4 w-px shrink-0 md:block"
          />

          {PINNED_TOOLS.map((tool) => (
            <a
              key={tool.name}
              href={tool.href(league)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(trigger, "hidden md:flex")}
            >
              {tool.icon && (
                // Somebody else's mark, so it is rounded off to sit in the bar
                // rather than to be their logo on our page.
                <Image
                  src={tool.icon}
                  alt=""
                  width={40}
                  height={40}
                  className="size-5 shrink-0 rounded opacity-90"
                />
              )}
              {tool.name}
              <ArrowUpRight className="size-3.5 shrink-0 opacity-70" />
            </a>
          ))}

          <HoverMenu
            label="More Tools"
            entries={tools}
            align="start"
            width="w-52"
          />
        </div>
      </nav>
    </header>
  );
}
