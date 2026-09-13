import { PageFrame } from "@/components/page-frame";
import { Lines } from "@/components/page-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { SIDEBAR } from "@/lib/nav";
import { HomeHeader } from "./header";

const SECTIONS = [
  ["Built here", "site"],
  ["The essentials", "essentials"],
  ["Worth knowing about", "more"],
] as const;

/**
 * The directory before the league its links carry is known: the headings as
 * they will stay, and a card's worth of space for every tool. It covers the
 * home page alone, which is why the page sits in a route group: the pages
 * beside it that only redirect must not stream a fallback first, or their
 * redirect would arrive as a script instead of a status code.
 */
export default function Loading() {
  return (
    <PageFrame header={<HomeHeader />}>
      {SECTIONS.map(([title, id]) => (
        <section key={id} className="mt-10 first:mt-0">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 rail:grid-cols-3">
            {SIDEBAR.find((g) => g.id === id)?.entries.map((_, i) => (
              <li
                key={i}
                className="border-border/60 flex items-start gap-3 rounded-xl border p-4"
              >
                <Skeleton className="mt-0.5 size-8 shrink-0 rounded-lg" />
                <Lines widths={["w-32", "w-full", "w-5/6"]} className="flex-1" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageFrame>
  );
}
