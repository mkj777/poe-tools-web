import { leagueSlug } from "./ninja.ts";

/**
 * A tool that lives somewhere else. This site does not try to rebuild what
 * these already do well: it points at them, and hands the ones that care the
 * league you are looking at.
 */
export type ExternalTool = {
  name: string;
  /** One line on what it is for, shown under the name in the menu. */
  blurb: string;
  /** `league` is the name Path of Exile uses, for example "Hardcore Allflame". */
  href: (league: string) => string;
};

/** Ignores the league, because the tool has no notion of one. */
const fixed = (url: string) => () => url;

export const EXTERNAL_TOOLS: readonly ExternalTool[] = [
  {
    name: "FilterBlade",
    blurb: "Build and tune a loot filter",
    href: fixed("https://www.filterblade.xyz/?game=Poe1"),
  },
  {
    name: "Wealthy Exile",
    blurb: "Sync your stash tabs and track what they are worth",
    href: fixed("https://wealthyexile.com/"),
  },
  {
    name: "Trade",
    blurb: "The official trade site, in this league",
    href: (league) =>
      `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
  },
  {
    name: "poe.ninja",
    blurb: "The whole economy, in this league",
    // The same spelling this site uses in its own paths: /allflame, /allflamehc.
    href: (league) => `https://poe.ninja/poe1/economy/${leagueSlug(league)}`,
  },
  {
    name: "Awakened PoE Trade",
    blurb: "Price check in an overlay while you play (download)",
    href: fixed("https://snosme.github.io/awakened-poe-trade/download"),
  },
  {
    name: "Path of Building",
    blurb: "Plan a build outside the game (download)",
    href: fixed("https://pathofbuilding.community/"),
  },
];

export function toolByName(name: string) {
  const tool = EXTERNAL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`No external tool named ${name}`);
  return tool;
}
