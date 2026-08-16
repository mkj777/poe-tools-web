/**
 * Beasts that appear as a red beast on the minimap: two Bestiary modifiers,
 * much more life, and impossible to run into outside a Bestiary spawn. Every
 * other capturable beast is a yellow one, so only this list needs storing.
 *
 * 55 entries, from each beast's PoE Wiki page plus the families that
 * cannot spawn normally. Regenerate with scripts/update-beast-rarity.mjs.
 */
export const RED_BEASTS: string[] = [
  "Black Mórrigan",
  "Craiceann, First of the Deep",
  "Craicic Croaker",
  "Craicic Maw",
  "Craicic Sand Spitter",
  "Craicic Savage Crab",
  "Craicic Shield Crab",
  "Craicic Spider Crab",
  "Craicic Squid",
  "Craicic Vassal",
  "Craicic Watcher",
  "Farric Ape",
  "Farric Chieftain",
  "Farric Flame Hellion Alpha",
  "Farric Frost Hellion Alpha",
  "Farric Gargantuan",
  "Farric Goatman",
  "Farric Goliath",
  "Farric Lynx Alpha",
  "Farric Magma Hound",
  "Farric Pit Hound",
  "Farric Taurus",
  "Farric Tiger Alpha",
  "Farric Ursa",
  "Farric Wolf Alpha",
  "Farrul, First of the Plains",
  "Fenumal Devourer",
  "Fenumal Hybrid Arachnid",
  "Fenumal Plagued Arachnid",
  "Fenumal Queen",
  "Fenumal Scorpion",
  "Fenumal Scrabbler",
  "Fenumal Widow",
  "Fenumus, First of the Night",
  "Poisonous Parasite",
  "Primal Beast",
  "Primal Crushclaw",
  "Primal Cystcaller",
  "Primal Rhex Matriarch",
  "Saqawal, First of the Sky",
  "Saqawine Blood Viper",
  "Saqawine Chimeral",
  "Saqawine Cobra",
  "Saqawine Retch",
  "Saqawine Rhex",
  "Saqawine Rhoa",
  "Saqawine Vulture",
  "Vivid Abberarach",
  "Vivid Vulture",
  "Vivid Watcher",
  "Wild Brambleback",
  "Wild Bristle Matron",
  "Wild Chimeral",
  "Wild Hellion Alpha",
  "Wild Rhex",
];

const RED = new Set(RED_BEASTS.map((n) => n.toLowerCase()));

export type BeastRarity = "red" | "yellow";

export const rarityOf = (name: string): BeastRarity =>
  RED.has(name.toLowerCase()) ? "red" : "yellow";
