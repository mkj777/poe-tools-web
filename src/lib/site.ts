/**
 * Where this site answers from, and the words it introduces itself with.
 *
 * Everything a crawler reads is absolute: a canonical link, an Open Graph URL
 * and a sitemap entry are all meaningless as a path. So the origin lives here,
 * once, and everything else is built from it.
 *
 * On Vercel the production domain is handed to the build, so a deploy is
 * already correct. `NEXT_PUBLIC_SITE_URL` overrides it, which is what a custom
 * domain needs: the Vercel variable keeps naming the *.vercel.app host, and a
 * canonical pointing there tells Google the real domain is the copy.
 */
const configured =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL &&
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  // Development. Nothing indexes localhost, and a relative canonical is worse
  // than a wrong one: it makes `new URL()` throw at build.
  "http://localhost:3000";

export const SITE_URL = configured.replace(/\/+$/, "");

export const SITE_NAME = "Path of Tools";

/**
 * The one sentence the site is summarised by, in the places that only get one:
 * the description of the home page, the Open Graph card, the directory listing
 * a search engine writes for itself when it disagrees with the description.
 *
 * It names the game in full and in short, because both are searched for, and it
 * says what the site *is* in the first four words, because that is the part an
 * answer engine quotes.
 */
export const SITE_DESCRIPTION =
  "A directory of every Path of Exile tool worth using, with live Bestiary beast prices and Atlas scarab node values built in. Free, no account, no ads.";

/**
 * Terms a page may be found by. Google has ignored the keywords meta since
 * 2009, so this is not written for it: it is written for the description and
 * heading copy to be checked against, and for the few engines that still read
 * the tag at all.
 */
export const SITE_KEYWORDS = [
  "Path of Exile tools",
  "PoE tools",
  "PoE bestiary",
  "bestiary prices",
  "beast prices",
  "PoE map regex",
  "stash search regex",
  "PoE leveling guide",
  "poe.ninja",
  "Path of Building",
];

/** An absolute URL for a path of this site. */
export function canonical(path = "/") {
  if (!path.startsWith("/")) path = `/${path}`;
  // The origin already has no trailing slash, so "/" would double it.
  return path === "/" ? SITE_URL : `${SITE_URL}${path.replace(/\/+$/, "")}`;
}

/**
 * The card a link unfurls into, for the pages that set an Open Graph block of
 * their own.
 *
 * A page that declares `openGraph` replaces the one it inherited, image and
 * all, so naming the drawn card here is what keeps a shared link from arriving
 * as a bare line of text. The path is the route `app/opengraph-image.tsx`
 * serves, resolved against `metadataBase`.
 */
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: `${SITE_NAME}: every Path of Exile tool in one place`,
};
