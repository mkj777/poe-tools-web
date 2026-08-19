/** A tool is one tab in the bar. The beasts table is the tool at the root. */
export type Tool = { slug: string; label: string };

export const TOOLS: readonly Tool[] = [
  { slug: "", label: "Beasts" },
  { slug: "wealth", label: "Wealth" },
] as const;

const segments = (pathname: string) => pathname.split("/").filter(Boolean);

export function toolHref(leagueSlug: string, tool: string) {
  return tool ? `/${leagueSlug}/${tool}` : `/${leagueSlug}`;
}

/**
 * Which tab to light up. Pages that are not tools, the simulation for one,
 * belong to the tool they hang under, which today is always the beasts table.
 */
export function activeTool(pathname: string) {
  const tool = segments(pathname)[1] ?? "";
  return TOOLS.some((t) => t.slug === tool) ? tool : "";
}

/** The same tool in another league, which is what the league select means. */
export function swapLeague(pathname: string, nextSlug: string) {
  return toolHref(nextSlug, activeTool(pathname));
}
