/**
 * Every Bestiary modifier name and its visible description.
 *
 * A captured beast carries up to three of these, and the Bestiary search reads
 * them: searching "far" returns beasts with "Farric Presence" as surely as
 * beasts named "Farric ...". Any fragment appearing in this text would drag in
 * arbitrary beasts, so the generator refuses to use one.
 *
 * Generated from the PoE Wiki (List_of_bestiary_modifiers + the mods table).
 * 28 entries. Regenerate with scripts/update-bestiary-mods.mjs.
 */
export const BESTIARY_MOD_TEXT: string[] = [
  "Aspect of the Hellion",
  "Summons a spectral hellion which chases after the player. On contact, it detonates itself into multiple fire projectiles.",
  "Bestial",
  "Blood Geyser",
  "Monster fires small arcing blood projectiles that detonate on contact with the ground and sometimes create a blood geyser.",
  "Churning Claws",
  "Many small pincers emerge from the ground and deal damage.",
  "Craicic Presence",
  "Has an aura which grants 60% of Physical Damage as Extra Cold Damage and 20% reduced Damage taken.",
  "Crimson Flock",
  "Summons small bird minions.",
  "Crushing Claws",
  "A crab emerges from the ground and slashes at enemies.",
  "Deep One's Presence",
  "Has an aura which grants 60% of Physical Damage as Extra Lightning Damage and 25% chance to Blind on Hit.",
  "Erupting Winds",
  "Summons tornadoes in a nova, which deal physical damage over time.",
  "Farric Presence",
  "Has an aura which grants 15% increased Attack Speed, 50% increased Accuracy Rating, and 50% increased Critical Strike Chance.",
  "Fenumal Presence",
  "Has an aura which grants 25% of non-Chaos Damage as Extra Chaos Damage and 100% chance to Poison on Hit.",
  "Fertile Presence",
  "Has an aura which grants 30% increased Damage, Stun immunity, and prevents action speed from being lowered below the base.",
  "Hadal Dive",
  "Summons spectral crabs that detonate to create a Vortex.",
  "Incendiary Mite",
  "Spectral insect charges an electric ball and explodes.",
  "Infested Earth",
  "Devourers emerge and attack.",
  "of Beasts",
  "of Harvest Beasts",
  "of Skittering",
  "Putrid Flight",
  "A spectral vulture flies over and drops bombs over its flight path.",
  "Raven Caller",
  "Many small ravens dive towards their target with an area of effect attack.",
  "Saqawine Presence",
  "Has an aura which grants 10% chance to Avoid damage from hits and 15% increased Movement Speed.",
  "Satyr Storm",
  "Multiple spectral goatmen leap down to deal damage.",
  "Spectral Stampede",
  "A large row of spectral rhoas stampede in a straight line.",
  "Spectral Swipe",
  "A spectral animal slams the ground.",
  "Tiger Prey",
  "Aided by a spectral tiger which attacks with a large area of effect swipe attack.",
  "Unstable Swarm",
  "Several spectral spiders burrow into the ground. After a delay, they detonate for large amounts of Chaos damage.",
  "Vile Hatchery",
  "Spawns many small green spiders.",
  "Winter Bloom",
  "Several ice flowers bloom then explode.",
];

/**
 * Just the names — what a captured beast's tooltip prints in red above the
 * ordinary monster modifiers. The simulation rolls from these.
 */
export const BESTIARY_MOD_NAMES: string[] = [
  "Aspect of the Hellion",
  "Blood Geyser",
  "Churning Claws",
  "Craicic Presence",
  "Crimson Flock",
  "Crushing Claws",
  "Deep One's Presence",
  "Erupting Winds",
  "Farric Presence",
  "Fenumal Presence",
  "Fertile Presence",
  "Hadal Dive",
  "Incendiary Mite",
  "Infested Earth",
  "Putrid Flight",
  "Raven Caller",
  "Saqawine Presence",
  "Satyr Storm",
  "Spectral Stampede",
  "Spectral Swipe",
  "Tiger Prey",
  "Unstable Swarm",
  "Vile Hatchery",
  "Winter Bloom",
];
