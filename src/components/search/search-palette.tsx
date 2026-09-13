"use client";

import { useRouter } from "next/navigation";
import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  CornerDownLeft,
  MessageCircleQuestionMark,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSidebar } from "@/components/ui/sidebar";
import { ToolIcon } from "@/components/tool-icon";
import { useIsApple } from "@/hooks/use-apple";
import { useLeague } from "@/hooks/use-league";
import type { League } from "@/lib/ninja";
import {
  RECENT_CAP,
  SEARCH_INDEX,
  entryHref,
  remember,
  search,
  type Hit,
  type SearchEntry,
} from "@/lib/search";
import { createStorageStore } from "@/lib/storage-store";
import { cn } from "@/lib/utils";
import { closeSearch, openSearch, searchOpen } from "./search-store";

/**
 * What was opened from here, newest first, so the next visit starts with what
 * the last one reached for. Ids of index entries; one that no longer exists
 * is skipped when the list is read rather than when it was written.
 */
const recentStore = createStorageStore<string[]>(
  "search:recent",
  (raw) => {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not a list");
    return parsed
      .filter((id): id is string => typeof id === "string")
      .slice(0, RECENT_CAP);
  },
  [],
);

/**
 * One hit. The icon the entry wears everywhere else, the title, the line
 * under it, and on the right what the row has to say for itself: the subject
 * or alias that brought it here when its name did not, and the arrow of a
 * link that leaves the site.
 *
 * The trailing span is always there, even empty, because the shadcn item
 * appends an invisible check mark to any row without one, and a mark that is
 * there in some rows and not others moves the text about.
 */
function Row({
  hit,
  value,
  onSelect,
  onMouseDown,
}: {
  hit: Hit;
  value: string;
  onSelect: () => void;
  onMouseDown: (event: MouseEvent) => void;
}) {
  const { entry, reason } = hit;
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      onMouseDown={onMouseDown}
      className="gap-3 py-2"
    >
      {entry.icon ? (
        <ToolIcon icon={entry.icon} className="size-6" />
      ) : (
        <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center">
          <MessageCircleQuestionMark className="size-5" />
        </span>
      )}
      <span className="grid min-w-0 flex-1 leading-tight">
        <span className="truncate">{entry.title}</span>
        <span className="text-muted-foreground truncate text-xs">
          {entry.subtitle}
        </span>
      </span>
      <CommandShortcut className="flex shrink-0 items-center gap-1.5 tracking-normal">
        {reason && (
          <Badge
            variant="outline"
            className="font-normal"
            title={`Matched on ${reason}`}
          >
            {reason}
          </Badge>
        )}
        {entry.external && <ArrowUpRight className="size-3.5" />}
      </CommandShortcut>
    </CommandItem>
  );
}

/**
 * What the keys do, for a reader with keys: a wide enough window and a
 * pointer that is not a finger. A phone gets the rows and nothing else, since
 * none of this is true of a phone.
 */
function Legend({ apple }: { apple: boolean }) {
  return (
    <div className="text-muted-foreground hidden items-center gap-4 border-t px-3 py-2 text-xs sm:pointer-fine:flex">
      <span className="flex items-center gap-1.5">
        <KbdGroup>
          <Kbd>
            <ArrowUp />
          </Kbd>
          <Kbd>
            <ArrowDown />
          </Kbd>
        </KbdGroup>
        navigate
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>
          <CornerDownLeft />
        </Kbd>
        open
      </span>
      <span className="flex items-center gap-1.5">
        <KbdGroup>
          <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
          <Kbd>
            <CornerDownLeft />
          </Kbd>
        </KbdGroup>
        new tab
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        <Kbd>Esc</Kbd>
        close
      </span>
    </div>
  );
}

/**
 * The inside of the dialog, and everything that is forgotten when it closes:
 * the query, the hits, which row is lit. The dialog unmounts its content on
 * closing, so all of that is gone by the next opening without anybody having
 * to clear it.
 */
function SearchBody({
  leagues,
  fallback,
}: {
  leagues: League[];
  fallback: string;
}) {
  const router = useRouter();
  const { slug, league } = useLeague(leagues, fallback);
  const { setOpenMobile } = useSidebar();
  const apple = useIsApple();

  // Ranked as typed rather than a frame behind: the list is small enough that
  // the ranking costs less than a paint, and cmdk lights the first row of
  // whatever list is on screen when the search changes. A list from the
  // previous keystroke would leave the light on the wrong row.
  const [query, setQuery] = useState("");
  const groups = useMemo(() => search(SEARCH_INDEX, query), [query]);

  const recentIds = useSyncExternalStore(
    recentStore.subscribe,
    recentStore.read,
    recentStore.server,
  );
  const recent: SearchEntry[] =
    query.trim() === ""
      ? recentIds.flatMap((id) => {
          const entry = SEARCH_INDEX.byId.get(id);
          return entry ? [entry] : [];
        })
      : [];

  // Whether the row being opened was asked for in a new tab. cmdk hands its
  // select handler no event, so the modifier is read off the key or the
  // click that is about to select, and cleared once it has been used.
  const newTab = useRef(false);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") newTab.current = event.metaKey || event.ctrlKey;
  };
  const onMouseDown = (event: MouseEvent) => {
    newTab.current = event.metaKey || event.ctrlKey;
  };

  const choose = (entry: SearchEntry) => {
    const { href, external } = entryHref(entry, { slug, league });
    const inNewTab = newTab.current;
    newTab.current = false;
    recentStore.write(remember(recentStore.read(), entry.id));
    closeSearch();
    setOpenMobile(false);
    if (external || inNewTab) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      router.push(href);
    }
  };

  return (
    <Command
      shouldFilter={false}
      loop
      label="Search"
      className="h-full"
      onKeyDown={onKeyDown}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search tools, questions, atlas passives"
      />
      <CommandList className="max-h-none min-h-0 flex-1 sm:max-h-[min(60svh,26rem)]">
        <CommandEmpty>Nothing matches &quot;{query.trim()}&quot;.</CommandEmpty>
        {recent.length > 0 && (
          <CommandGroup heading="Recent">
            {recent.map((entry) => (
              <Row
                key={entry.id}
                hit={{ entry, score: 0 }}
                // The same entry sits in the group below, and cmdk tells its
                // rows apart by value.
                value={`recent:${entry.id}`}
                onSelect={() => choose(entry)}
                onMouseDown={onMouseDown}
              />
            ))}
          </CommandGroup>
        )}
        {groups.map((group) => (
          <CommandGroup key={group.id} heading={group.label}>
            {group.hits.map((hit) => (
              <Row
                key={hit.entry.id}
                hit={hit}
                value={hit.entry.id}
                onSelect={() => choose(hit.entry)}
                onMouseDown={onMouseDown}
              />
            ))}
          </CommandGroup>
        ))}
      </CommandList>
      <Legend apple={apple} />
    </Command>
  );
}

/**
 * The palette: every tool, every question and every Atlas passive of the
 * site behind one field, opened from the sidebar, the mobile bar or the
 * keyboard.
 *
 * A sheet on a phone, since a dialog floating in the middle of a small screen
 * over a keyboard is neither; the height follows the viewport as the keyboard
 * takes its share, and the close button stays, because a phone has no Escape
 * key and a sheet leaves nothing beside it to tap. From a small window up it
 * is the panel every palette is, a little below the top, wide enough for a
 * title and a reason on one row, and closed the way palettes are closed.
 */
export function SearchPalette({
  open,
  leagues,
  fallback,
}: {
  open: boolean;
  leagues: League[];
  fallback: string;
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => (next ? openSearch() : closeSearch())}
      title="Search"
      description="Search every tool and page of the site"
      // Back to whatever opened it. Radix would look for a trigger of its own
      // and, finding none, leave focus on the body.
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        const opener = searchOpen.opener();
        if (opener instanceof HTMLElement) opener.focus();
      }}
      showCloseButton
      className={cn(
        "top-0 left-0 h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 rounded-none! ring-0",
        "sm:top-[12vh] sm:left-1/2 sm:h-auto sm:max-h-[min(80svh,36rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-xl! sm:ring-1",
        // Room for the close button beside the field, and the button itself
        // only where the field runs the full width of the screen.
        "max-sm:[&_[data-slot=command-input-wrapper]]:pr-10 sm:[&>[data-slot=dialog-close]]:hidden",
      )}
    >
      <SearchBody leagues={leagues} fallback={fallback} />
    </CommandDialog>
  );
}
