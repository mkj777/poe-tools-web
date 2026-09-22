/**
 * The animation features `LazyMotion` loads after the page is up: `domMax`
 * rather than `domAnimation`, because the threshold highlight on the beasts
 * page travels with `layoutId`, and layout is the one thing the smaller
 * bundle leaves out. Its own module, so that it is its own chunk.
 */
import { domMax } from "motion/react";

export default domMax;
