/**
 * A tool is one tab in the bar. The beasts table is the tool at the root.
 *
 * The icon is the item the tool is about, taken from the game rather than from
 * an icon set, because that is what a player recognises the tool by before they
 * have read the label.
 */
export type Tool = {
  slug: string;
  label: string;
  /**
   * `rounded` is for an icon that is a square image rather than an item cut
   * out of the game, which would otherwise sit in the bar as a hard tile.
   */
  icon: { src: string; alt: string; rounded?: boolean };
};

export const TOOLS: readonly Tool[] = [
  {
    slug: "",
    label: "Beasts",
    icon: { src: "/Imprinted_Bestiary_Orb_inventory_icon.png", alt: "" },
  },
  {
    slug: "maps",
    label: "Maps",
    icon: {
      src: "/Nightmare_Map_(Curse_of_the_Allflame)_inventory_icon.png",
      alt: "",
    },
  },
  {
    // The one tool here that is not a page: a desktop app, so what it wears is
    // its own icon rather than an item out of the game.
    slug: "leveling",
    label: "Leveling",
    icon: { src: "/poe_leveling_guide_icon.png", alt: "", rounded: true },
  },
] as const;

const segments = (pathname: string) => pathname.split("/").filter(Boolean);

export function toolHref(leagueSlug: string, tool: string) {
  return tool ? `/${leagueSlug}/${tool}` : `/${leagueSlug}`;
}

/**
 * Which tab to light up. Pages that are not tools, the simulation for one,
 * belong to the tool they hang under, which today is always the beasts table.
 * The tools in the menu beside these tabs are other people's sites, so none of
 * them is ever the active one.
 */
export function activeTool(pathname: string) {
  const tool = segments(pathname)[1] ?? "";
  return TOOLS.some((t) => t.slug === tool) ? tool : "";
}

/** The same tool in another league, which is what the league select means. */
export function swapLeague(pathname: string, nextSlug: string) {
  return toolHref(nextSlug, activeTool(pathname));
}
