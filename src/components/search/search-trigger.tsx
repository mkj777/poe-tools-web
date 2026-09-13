"use client";

import { useSyncExternalStore } from "react";
import { Search } from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsApple } from "@/hooks/use-apple";
import { openSearch, preloadSearch, searchOpen } from "./search-store";

/**
 * The field at the top of the sidebar, which is a button dressed as one.
 *
 * A real input here would have to hand its text to the dialog and lose its
 * focus to it, so the reader would type into one field and watch another.
 * This one only opens the palette, and says how to open it without reaching
 * for it. Folded down to its icons, the column keeps the glass and the
 * shortcut moves into the tooltip, the same way every other entry keeps its
 * icon and moves its name.
 */
export function SearchTrigger() {
  const { isMobile, setOpenMobile } = useSidebar();
  const apple = useIsApple();
  const open = useSyncExternalStore(
    searchOpen.subscribe,
    searchOpen.read,
    searchOpen.server,
  );

  const keys = (
    <KbdGroup>
      <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </KbdGroup>
  );

  return (
    <SidebarGroup className="py-0 pb-1">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            variant="outline"
            tooltip={{
              children: (
                <span className="flex items-center gap-2">
                  Search {keys}
                </span>
              ),
            }}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-keyshortcuts="Control+K Meta+K"
            className="text-muted-foreground hover:text-muted-foreground h-9 font-normal"
            onClick={() => {
              // The sheet covers the whole screen on a phone, and the palette
              // would otherwise open over it and close onto it.
              if (isMobile) setOpenMobile(false);
              openSearch();
            }}
            onPointerEnter={preloadSearch}
            onFocus={preloadSearch}
          >
            <Search />
            <span className="flex-1 truncate group-data-[collapsible=icon]:sr-only">
              Search tools
            </span>
            <span className="group-data-[collapsible=icon]:hidden">{keys}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
