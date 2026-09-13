/**
 * What the Bestiary's search field accepts, kept apart from the solver.
 *
 * The number is wanted on two pages that only print it, and importing it from
 * bestiary-regex.ts brought the solver along: the modifier corpora, the three
 * word lists and the sets built from them at module load, none of which a
 * character count needs. This file has no imports, so it costs what it says.
 */

/** Characters the Bestiary search accepts before it cuts the input off. */
export const MAX_PATTERN_LENGTH = 249;
