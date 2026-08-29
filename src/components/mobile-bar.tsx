import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";

/**
 * The bar a phone or a tablet gets, where the sidebar is a sheet that has to be
 * asked for. From 1024px up the sidebar is already on screen and says the name
 * itself, so this row would only be a second copy of it.
 */
export function MobileBar() {
  return (
    <header className="bg-card/90 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b px-2 backdrop-blur lg:hidden">
      <SidebarTrigger className="size-10" />
      <Link
        href="/"
        aria-label="Path of Tools"
        className="focus-visible:ring-ring rounded-md px-1 py-2 outline-none focus-visible:ring-2"
      >
        <Wordmark />
      </Link>
    </header>
  );
}
