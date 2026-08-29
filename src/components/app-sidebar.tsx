"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeftRight,
  ArrowUpRight,
  Compass,
  FlaskConical,
  Footprints,
  Funnel,
  Gem,
  Hammer,
  Landmark,
  Map as MapIcon,
  PawPrint,
  Recycle,
  Regex,
  Tag,
  TrendingUp,
  Wallet,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";
import {
  SITE_TOOLS,
  activePage,
  activeTool,
  leagueFromPath,
  pageHref,
  toolHref,
  type ToolIcon,
} from "@/lib/nav";
import { leagueSlug, type League } from "@/lib/ninja";
import { TOOL_GROUPS, toolsIn, type ExternalIcon } from "@/lib/tools";
import { cn } from "@/lib/utils";

/**
 * Every glyph in the sidebar comes from one set, so sixteen entries read as one
 * list. A vendor logo would be the loudest thing in a column that is meant to
 * be scanned, and only three of the twelve have one to give.
 */
const TOOL_ICONS: Record<ToolIcon, LucideIcon> = {
  beasts: PawPrint,
  simulation: FlaskConical,
  maps: MapIcon,
  leveling: Compass,
};

const EXTERNAL_ICONS: Record<ExternalIcon, LucideIcon> = {
  trade: ArrowLeftRight,
  ninja: TrendingUp,
  wealth: Wallet,
  antiquary: Landmark,
  disenchant: Recycle,
  pob: Hammer,
  timeless: Gem,
  cluster: Waypoints,
  filter: Funnel,
  pricecheck: Tag,
  regex: Regex,
  lab: Footprints,
};

/** Label over blurb. Both are gone once the sidebar is down to its icons. */
function Label({ label, blurb }: { label: string; blurb: string }) {
  return (
    <span className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
      <span className="truncate font-medium">{label}</span>
      <span className="text-muted-foreground truncate text-xs font-normal">
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

  const tool = activeTool(pathname);
  const page = activePage(pathname);

  // The chrome has no league of its own any more: it follows the page, and
  // falls back to the one a bare visit lands on. The picking happens on the
  // pages that read prices, beside the prices they read.
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
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarMenu>
            {SITE_TOOLS.map((site) => {
              const Icon = TOOL_ICONS[site.icon];
              const on = site.slug === tool;
              return (
                <SidebarMenuItem key={site.slug}>
                  {on && !page && <ActiveMark />}
                  <SidebarMenuButton
                    asChild
                    size="lg"
                    isActive={on && !page}
                    tooltip={site.label}
                  >
                    <Link href={toolHref(site, slug)} onClick={close}>
                      <Icon />
                      <Label label={site.label} blurb={site.blurb} />
                    </Link>
                  </SidebarMenuButton>

                  {/* A page of the tool rather than a tool of its own, so it
                      is indented under it instead of listed beside it. */}
                  {site.pages && on && (
                    <SidebarMenuSub className="group-data-[collapsible=icon]:hidden">
                      {site.pages.map((sub) => (
                        <SidebarMenuSubItem key={sub.slug}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={sub.slug === page}
                          >
                            <Link
                              href={pageHref(site, sub, slug)}
                              onClick={close}
                            >
                              <span className="truncate">{sub.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Everything under this line leaves the site. The groups are the
            question you arrived with: what things cost, what to build, what
            to run with. */}
        {TOOL_GROUPS.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {toolsIn(group.id).map((external) => {
                const Icon = EXTERNAL_ICONS[external.icon];
                return (
                  <SidebarMenuItem key={external.name}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      tooltip={external.name}
                      className="group/external"
                    >
                      <a
                        href={external.href(league)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={close}
                      >
                        <Icon />
                        <Label label={external.name} blurb={external.blurb} />
                        <ArrowUpRight
                          className={cn(
                            "text-muted-foreground -translate-x-0.5 opacity-0 transition-all duration-150",
                            "group-hover/external:translate-x-0 group-hover/external:opacity-100",
                            "group-focus-visible/external:translate-x-0 group-focus-visible/external:opacity-100",
                            // A finger cannot hover, and on a phone the arrow
                            // is the only thing saying the entry leaves.
                            "pointer-coarse:translate-x-0 pointer-coarse:opacity-70",
                            "group-data-[collapsible=icon]:hidden",
                          )}
                        />
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
