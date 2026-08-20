import { leagueSlug } from "./ninja.ts";

/**
 * A tool that lives somewhere else. This site does not try to rebuild what
 * these already do well: it points at them, and hands the ones that care the
 * league you are looking at.
 */
export type ExternalTool = {
  name: string;
  /** `league` is the name Path of Exile uses, for example "Hardcore Allflame". */
  href: (league: string) => string;
};

/** Ignores the league, because the tool has no notion of one. */
const fixed = (url: string) => () => url;

export const EXTERNAL_TOOLS: readonly ExternalTool[] = [
  {
    name: "FilterBlade",
    href: fixed("https://www.filterblade.xyz/?game=Poe1"),
  },
  {
    name: "Wealthy Exile",
    href: fixed("https://wealthyexile.com/"),
  },
  {
    name: "Trade",
    href: (league) =>
      `https://www.pathofexile.com/trade/search/${encodeURIComponent(league)}`,
  },
  {
    name: "poe.ninja",
    // The same spelling this site uses in its own paths: /allflame, /allflamehc.
    href: (league) => `https://poe.ninja/poe1/economy/${leagueSlug(league)}`,
  },
  {
    name: "Awakened PoE Trade",
    href: fixed("https://snosme.github.io/awakened-poe-trade/download"),
  },
  {
    name: "Path of Building",
    href: fixed("https://pathofbuilding.community/"),
  },
];

export function toolByName(name: string) {
  const tool = EXTERNAL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`No external tool named ${name}`);
  return tool;
}
