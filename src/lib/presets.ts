/**
 * The preset thresholds, and the rule that decides what "worth exactly this
 * much" means.
 *
 * There used to be a server-side planner beside them, precomputing patterns for
 * these five thresholds. It computed the same thing `useBestiaryPattern` does
 * in a worker, cost about three seconds of blocking render, and produced
 * nothing the first paint shows: the table starts with no threshold at all. The
 * split it worked from was already being recomputed in the browser too, with a
 * comment on both sides warning that the two had to agree.
 */

/** The thresholds the buttons offer. */
export const PRESET_THRESHOLDS = [1, 2, 3, 4, 5];

/** The beasts a threshold calls "3c", as opposed to "3c and up". */
export const inBand = (value: number, threshold: number) =>
  value >= threshold && value < threshold + 1;

/**
 * How many beasts have to sit at exactly the threshold before they are worth a
 * bulk step of their own. Under this they just ride along with the sell search,
 * which then starts at the threshold rather than one chaos above it.
 */
export const BAND_MIN = 10;
