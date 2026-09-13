"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openSearch, preloadSearch } from "./search-store";

/**
 * The glass in the mobile bar, where the sidebar is a sheet and its field is
 * behind a tap. A search that is two taps away is one nobody reaches for.
 */
export function SearchButton() {
  return (
    <Button
      variant="ghost"
      size="icon-lg"
      aria-label="Search"
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      className="text-muted-foreground hover:text-foreground ml-auto size-10"
      onClick={openSearch}
      onPointerEnter={preloadSearch}
      onFocus={preloadSearch}
    >
      <Search />
    </Button>
  );
}
