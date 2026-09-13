"use client";

import Link, { useLinkStatus } from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowUpRight } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { SearchTrigger } from "@/components/search/search-trigger";
import { ToolIcon } from "@/components/tool-icon";
import { Wordmark } from "@/components/wordmark";
import { useLeague } from "@/hooks/use-league";
import {
  SIDEBAR,
  activeTool,
  toolHref,
  toolPrefetch,
  type SidebarEntry,
  type SidebarGroup as Group,
} from "@/lib/nav";
import type { League } from "@/lib/ninja";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Label over blurb. Both are gone once the sidebar is down to its icons.
 *
 * The blurb takes a second line rather than an ellipsis: a sentence cut short
 * says less than the name above it already does, and a column of names is not
 * so tidy that it is worth a lost word.
 */
function Label({ label, blurb }: { label: string; blurb: string }) {
  return (
    <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
      <span className="truncate font-medium">{label}</span>
      <span className="text-muted-foreground line-clamp-2 text-xs font-normal">
        {blurb}
      </span>
    </span>
  );
}

/** Where the bar sits, and whether it has somewhere to travel from. */
type BarPlace = { x: number; y: number; height: number; settled: boolean };

/**
 * The bar beside the page you are on. It travels from one entry to the next
 * rather than blinking out and in, which is the one animation in the sidebar
 * that carries something: where you just came from.
 *
 * One bar for the whole column, laid over it and moved with a transform, so
 * the travel is a CSS transition and no animation library has to ride along
 * on every page for a two pixel line. It measures the active entry after each
 * change of page and slides to it; the first placing is not animated, or the
 * bar would arrive from the top on every load. A reader who has asked their
 * system for less motion gets the bar in its new place at once.
 *
 * Until it has measured, and wherever it cannot (the sheet on a phone mounts
 * its content only while open), the entry draws a mark of its own in the same
 * place, so the server's HTML already carries the bar and nothing waits for
 * the script.
 */
function ActiveBar({ place }: { place: BarPlace }) {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-primary pointer-events-none absolute top-0 left-0 w-0.5 rounded-full",
        place.settled &&
          "transition-[transform,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
      )}
      style={{
        height: place.height,
        transform: `translate(${place.x}px, ${place.y}px)`,
      }}
    />
  );
}

/** The mark an entry draws for itself while there is no travelling bar. */
function Mark() {
  return (
    <span
      aria-hidden
      className="bg-primary absolute inset-y-1.5 -left-1 w-0.5 rounded-full"
    />
  );
}

/** How far the travelling bar stays in from the top and bottom of its row. */
const BAR_INSET = 6;

/**
 * The inside of a page entry, and what it does while the click is still on
 * its way. A page that was fetched ahead arrives at once and nothing here
 * happens. One that was not, on a slow connection, is pending until its
 * loading state lands, and then the row dims after a moment (the CSS waits
 * 100ms, so a fast arrival never flickers) and tells the column, so the bar
 * and the highlight move to it without waiting for the address to change.
 */
function Pending({
  slug,
  onPending,
  children,
}: {
  slug: string;
  onPending: (slug: string | null) => void;
  children: ReactNode;
}) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    onPending(pending ? slug : null);
  }, [pending, slug, onPending]);
  return (
    <span
      data-pending={pending || undefined}
      className="nav-pending flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:justify-center"
    >
      {children}
    </span>
  );
}

/**
 * A row tall enough for a wrapped blurb, and a square once the column is down
 * to its icons.
 *
 * The two want opposite things. Open, the row has to grow past the 48px of the
 * `lg` size so a two line blurb is not clipped, which is what `min-h-12` and
 * the padding are for. Collapsed, shadcn asks for a 32px square, and a
 * min-height beats the height it sets: the row stayed 51px tall in a 34px wide
 * rail, with the icon flush against the left edge because the button never
 * centres what is in it. So the growth is scoped to the open column, and the
 * icon is centred for the collapsed one.
 */
const ROW =
  "h-auto min-h-12 py-1.5 group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:py-0";

type EntryProps = {
  entry: SidebarEntry;
  /** The league as Path of Exile spells it, for the links that take one. */
  league: string;
  /** The same league as a path segment. */
  slug: string;
  /** The slug of the tool the current page belongs to. */
  active: string;
  /** Whether the active entry draws its own mark, see ActiveBar. */
  marked: boolean;
  onNavigate: () => void;
  /** Which page entry is waiting for its page, if any. See Pending. */
  onPending: (slug: string | null) => void;
};

function Entry({
  entry,
  league,
  slug,
  active,
  marked,
  onNavigate,
  onPending,
}: EntryProps) {
  if (entry.kind === "page") {
    const tool = entry.page;
    const on = tool.slug === active;
    return (
      <SidebarMenuItem data-tool={tool.slug}>
        {on && marked && <Mark />}
        <SidebarMenuButton
          asChild
          size="lg"
          isActive={on}
          tooltip={tool.label}
          className={ROW}
        >
          <Link
            href={toolHref(tool, slug)}
            prefetch={toolPrefetch(tool)}
            onClick={onNavigate}
          >
            <Pending slug={tool.slug} onPending={onPending}>
              <ToolIcon icon={tool.icon} />
              <Label label={tool.label} blurb={tool.blurb} />
            </Pending>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const tool = entry.link;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        size="lg"
        tooltip={tool.name}
        className={cn("group/external", ROW)}
      >
        <a
          href={tool.href(league)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNavigate}
        >
          <ToolIcon icon={tool.icon} />
          <Label label={tool.name} blurb={tool.blurb} />
          <ArrowUpRight
            className={cn(
              "text-muted-foreground -translate-x-0.5 opacity-0 transition-all duration-150",
              "group-hover/external:translate-x-0 group-hover/external:opacity-100",
              "group-focus-visible/external:translate-x-0 group-focus-visible/external:opacity-100",
              // A finger cannot hover, and on a phone the arrow is the only
              // thing saying the entry leaves.
              "pointer-coarse:translate-x-0 pointer-coarse:opacity-70",
              "group-data-[collapsible=icon]:hidden",
            )}
          />
        </a>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * One heading and what hangs under it. Every group stands open: a heading that
 * has to be clicked before it says anything is a list you have to be told
 * about, and the column is short enough to be read instead.
 */
function NavGroup({
  group,
  ...rest
}: { group: Group } & Omit<EntryProps, "entry">) {
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>

      <SidebarGroupContent>
        <SidebarMenu>
          {group.entries.map((entry) => (
            <Entry
              key={entry.kind === "page" ? entry.page.slug : entry.link.name}
              entry={entry}
              {...rest}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  leagues,
  fallback,
}: {
  leagues: League[];
  /** The league the links fall back to, for a page that carries none. */
  fallback: string;
}) {
  const { pathname, slug, league } = useLeague(leagues, fallback);
  const { state, isMobile, setOpenMobile } = useSidebar();

  // The page you are on, or the one you have clicked and are still waiting
  // for. A click on a page that was fetched ahead changes the address at once
  // and the wait never registers; on one that was not, the column marks the
  // entry from the click on, and the address catches up. The wait remembers
  // the address it began at, so it counts for nothing once that has changed.
  const [pending, setPending] = useState<{ tool: string; at: string } | null>(
    null,
  );
  const onPending = useCallback(
    (tool: string | null) => setPending(tool ? { tool, at: pathname } : null),
    [pathname],
  );
  const active =
    pending && pending.at === pathname ? pending.tool : activeTool(pathname);

  // The sheet covers the whole screen on a phone, so a link that left it open
  // would hide the page it just opened.
  const close = () => setOpenMobile(false);

  // Where the travelling bar goes: the active entry, measured against the
  // column it scrolls in. Measured again whenever the entry changes size,
  // because the rows shrink when the column folds to its icons, and they do
  // it on a transition: the height at the moment of the fold is still the old
  // one, and only the observer sees it arrive.
  const column = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState<BarPlace | null>(null);
  useLayoutEffect(() => {
    const host = column.current;
    const item = host?.querySelector<HTMLElement>(`[data-tool="${active}"]`);
    if (!host || !item) {
      setBar(null);
      return;
    }
    const measure = () => {
      const from = host.getBoundingClientRect();
      const to = item.getBoundingClientRect();
      setBar((prev) => ({
        x: to.left - from.left - 4,
        y: to.top - from.top + host.scrollTop + BAR_INSET,
        height: Math.max(0, to.height - 2 * BAR_INSET),
        settled: prev !== null,
      }));
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(item);
    watch.observe(host);
    return () => watch.disconnect();
  }, [active, state, isMobile]);

  return (
    <Sidebar collapsible="icon">
      {/* Down to its icons the header has room for one thing, and the way back
          out is worth more there than a second copy of the name. */}
      <SidebarHeader className="h-14 flex-row items-center gap-1 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <Link
          href="/"
          onClick={close}
          aria-label="Path of Tools"
          className="focus-visible:ring-ring flex-1 rounded-md transition-opacity outline-none hover:opacity-80 focus-visible:ring-2 group-data-[collapsible=icon]:hidden"
        >
          <Wordmark />
        </Link>
        <SidebarTrigger className="text-muted-foreground hover:text-foreground hidden size-8 lg:flex" />
      </SidebarHeader>

      {/* Above the column rather than in it, so it stays put while the
          column scrolls. */}
      <SearchTrigger />

      <SidebarContent
        ref={column}
        className="relative gap-0 pb-[env(safe-area-inset-bottom)]"
      >
        {SIDEBAR.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            league={league}
            slug={slug}
            active={active}
            marked={bar === null}
            onNavigate={close}
            onPending={onPending}
          />
        ))}
        {bar && <ActiveBar place={bar} />}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
