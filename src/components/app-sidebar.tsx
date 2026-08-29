"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { ToolIcon } from "@/components/tool-icon";
import { Wordmark } from "@/components/wordmark";
import {
  SIDEBAR,
  activeTool,
  leagueFromPath,
  toolHref,
  type SidebarEntry,
  type SidebarGroup as Group,
} from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";
import { cn } from "@/lib/utils";

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

/**
 * The bar beside the page you are on. It travels from one entry to the next
 * rather than blinking out and in, which is the one animation in the sidebar
 * that carries something: where you just came from.
 */
function ActiveMark() {
  const still = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      layoutId="sidebar-active"
      transition={
        still
          ? { duration: 0 }
          : { type: "spring", stiffness: 500, damping: 40 }
      }
      className="bg-primary absolute inset-y-1.5 -left-1 w-0.5 rounded-full"
    />
  );
}

type EntryProps = {
  entry: SidebarEntry;
  /** The league as Path of Exile spells it, for the links that take one. */
  league: string;
  /** The same league as a path segment. */
  slug: string;
  /** The slug of the tool the current page belongs to. */
  active: string;
  onNavigate: () => void;
};

function Entry({ entry, league, slug, active, onNavigate }: EntryProps) {
  if (entry.kind === "page") {
    const tool = entry.page;
    const on = tool.slug === active;
    return (
      <SidebarMenuItem>
        {on && <ActiveMark />}
        <SidebarMenuButton
          asChild
          size="lg"
          isActive={on}
          tooltip={tool.label}
          className="h-auto min-h-12 py-1.5"
        >
          <Link href={toolHref(tool, slug)} onClick={onNavigate}>
            <ToolIcon icon={tool.icon} />
            <Label label={tool.label} blurb={tool.blurb} />
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
        className="group/external h-auto min-h-12 py-1.5"
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
 * One heading and what hangs under it. The lower groups start rolled up, so the
 * column opens on the seven entries a session begins with rather than on all
 * fifteen at once.
 *
 * Down to its icons a folded group would be unreachable, because the heading
 * that unfolds it is the thing that is hidden. So there, everything is open.
 */
function NavGroup({
  group,
  ...rest
}: { group: Group } & Omit<EntryProps, "entry">) {
  const { state, isMobile } = useSidebar();
  const [open, setOpen] = useState(!group.folded);
  const icons = state === "collapsed" && !isMobile;

  return (
    <Collapsible
      open={open || icons}
      onOpenChange={setOpen}
      className="group/fold"
    >
      <SidebarGroup className="py-1">
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger className="hover:text-foreground w-full cursor-pointer">
            {group.label}
            {group.folded && (
              <ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-open/fold:rotate-90" />
            )}
          </CollapsibleTrigger>
        </SidebarGroupLabel>

        <CollapsibleContent className="overflow-hidden data-closed:animate-collapsible-up data-open:animate-collapsible-down">
          <SidebarGroupContent>
            <SidebarMenu>
              {group.entries.map((entry) => (
                <Entry
                  key={
                    entry.kind === "page" ? entry.page.slug : entry.link.name
                  }
                  entry={entry}
                  {...rest}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
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
  const pathname = usePathname() ?? "";
  const { setOpenMobile } = useSidebar();

  // The chrome has no league of its own: it follows the page, and falls back to
  // the one a bare visit lands on. The picking happens on the pages that read
  // prices, beside the prices they read.
  const slug = leagueFromPath(pathname) || fallback;
  const league =
    leagues.find((l) => leagueSlug(l.id) === slug)?.id ?? leagues[0]?.id ?? "";

  // The sheet covers the whole screen on a phone, so a link that left it open
  // would hide the page it just opened.
  const close = () => setOpenMobile(false);

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

      <SidebarContent className="gap-0 pb-[env(safe-area-inset-bottom)]">
        {SIDEBAR.map((group) => (
          <NavGroup
            key={group.id}
            group={group}
            league={league}
            slug={slug}
            active={activeTool(pathname)}
            onNavigate={close}
          />
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
