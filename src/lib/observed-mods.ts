/**
 * Modifier lines seen on a captured beast in game and absent from both wiki
 * scrapes. Hand-maintained on purpose: `pnpm mods:update` and `pnpm
 * mods:monsters` overwrite their own files, and these would not survive there.
 *
 * No list of modifier text is ever complete — that gap is what showed a 50c
 * Wild Hellion Alpha in a 2c trash pattern (docs/bestiary-search.md, Test 14).
 * Every line here is one a screenshot actually caught, and every one of them is
 * a fragment collision waiting to happen, so they join the ban list.
 */

/**
 * A beast lucky enough to survive the altar keeps this, so it rides along on
 * any beast regardless of type — which makes it the worst of the lot to leave
 * out. Seen on most of the captures in Test 16.
 */
export const BLOOD_ALTAR =
  "10% chance not to be consumed when sacrificed at the Blood Altar";

/** Rollable, so the simulator draws from these alongside the scraped names. */
export const OBSERVED_MOD_NAMES = [
  // Test 14: on a Wild Hellion Alpha, and on no wiki page at all.
  "Stonemaul",
  // Test 16: on a Farric Goliath.
  "Spikes on Death",
];

/** Everything a fragment must stay out of. */
export const OBSERVED_MOD_LINES = [...OBSERVED_MOD_NAMES, BLOOD_ALTAR];
