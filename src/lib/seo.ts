import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, canonical } from "./site.ts";
import { SITE_TOOLS } from "./nav.ts";
import { EXTERNAL_TOOLS } from "./tools.ts";

/**
 * What a crawler is told about this site, kept out of the routes that serve it
 * so that all of it can be read by a test rather than by a build.
 *
 * The shapes here are schema.org, which is the vocabulary Google reads for rich
 * results and the one answer engines lean on to work out what a page is about
 * before they quote it.
 */

/* -------------------------------------------------------------------------- */
/* sitemap                                                                     */
/* -------------------------------------------------------------------------- */

export type SitemapEntry = {
  url: string;
  lastModified: Date;
  changeFrequency: "daily" | "weekly" | "monthly";
  priority: number;
};

/**
 * Every URL worth crawling, and nothing else.
 *
 * Built from the same list the sidebar is, so a tool added to the site is in
 * the sitemap without anybody remembering to put it there, and a tool the
 * sidebar no longer offers is still listed here: unlisted means offered to
 * nobody, not gone.
 *
 * The bare tool paths are left out on purpose. They redirect to a league, and
 * a sitemap full of redirects spends a crawl to arrive where the next line
 * already points. The first league poe.ninja lists is the current one, which
 * is the page nearly every visit wants, so it is the one ranked highest.
 */
export function sitemapEntries(
  leagueSlugs: readonly string[],
  now = new Date(),
): SitemapEntry[] {
  const entries: SitemapEntry[] = [
    {
      url: canonical("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const tool of SITE_TOOLS) {
    if (tool.league) continue;
    entries.push({
      url: canonical(`/${tool.slug}`),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  leagueSlugs.forEach((slug, i) => {
    // Past leagues are the same pages over colder numbers. They stay in, since
    // a standard price is still a price somebody looks up, but they do not
    // compete with the league everyone is actually playing.
    const current = i === 0;
    for (const tool of SITE_TOOLS) {
      if (!tool.league) continue;
      entries.push({
        url: canonical(`/${tool.slug}/${slug}`),
        lastModified: now,
        changeFrequency: current ? "daily" : "monthly",
        priority: current ? 0.9 : 0.5,
      });
    }
  });

  return entries;
}

/* -------------------------------------------------------------------------- */
/* robots                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The crawlers that read a page to answer a question rather than to list it.
 * They are covered by the wildcard already; naming them says the welcome is
 * deliberate, which is the only thing a robots file can say about intent.
 *
 * Google-Extended and Applebot-Extended are not crawlers at all: they are the
 * switches deciding whether what Googlebot and Applebot already fetched may be
 * used to ground an answer. Unmentioned they can default to off, and being left
 * out of an AI Overview is the one kind of invisibility this site cannot
 * afford.
 */
export const ANSWER_ENGINES = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "CCBot",
  "meta-externalagent",
];

export type RobotsRule = {
  userAgent: string | string[];
  allow?: string | string[];
  disallow?: string | string[];
};

export function robotsRules(): RobotsRule[] {
  return [
    // The API refreshes prices on a cron and answers nothing a reader wants.
    { userAgent: "*", allow: "/", disallow: ["/api/"] },
    { userAgent: ANSWER_ENGINES, allow: "/", disallow: ["/api/"] },
  ];
}

/* -------------------------------------------------------------------------- */
/* llms.txt                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The site as one page of markdown, for the agents that fetch it.
 *
 * No search engine has committed to reading this file and Google has said it
 * will not, so it earns no ranking on its own. It is here because it costs one
 * route, and the coding assistants and in-product agents that do read it are
 * exactly the readers a directory of tools is for. It is built from the
 * catalogue, so it cannot fall behind the sidebar.
 */
export function llmsTxt() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "Path of Exile 1. Prices come from the poe.ninja economy API and the",
    "official trade site, and are at most 15 minutes old.",
    "",
    "## Tools built here",
    "",
  ];

  for (const tool of SITE_TOOLS) {
    // A real URL rather than a placeholder: an angle bracket in a link is not
    // a link any more, and the note at the bottom says the segment varies.
    const path = tool.league ? `/${tool.slug}/standard` : `/${tool.slug}`;
    lines.push(`- [${tool.label}](${canonical(path)}): ${tool.about}`);
  }

  lines.push("", "## Tools linked to", "");
  for (const tool of EXTERNAL_TOOLS) {
    lines.push(`- [${tool.name}](${tool.href("Standard")}): ${tool.about}`);
  }

  lines.push(
    "",
    "## Notes",
    "",
    "- The last segment of a price URL is the league, spelled the way poe.ninja spells it: `standard`, `allflame`, `allflamehc`.",
    "- The Bestiary search field runs a real regex per line and truncates past 249 characters.",
    "- The map stash search splits on whitespace, ANDs the terms, and negates one with `!`.",
    "",
  );

  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* structured data                                                             */
/* -------------------------------------------------------------------------- */

type Ld = Record<string, unknown>;

/** The publisher every other node points back at. */
const PUBLISHER = `${SITE_URL}/#organization`;

/**
 * Site level, rendered once in the root layout. The ids are what let the per
 * page nodes below point at this one instead of repeating it.
 */
export function websiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": PUBLISHER,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": PUBLISHER },
        inLanguage: "en",
      },
    ],
  };
}

/** A tool of this site, which is a thing you use rather than a page you read. */
export function webAppLd(app: {
  name: string;
  path: string;
  description: string;
}): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: app.name,
    url: canonical(app.path),
    description: app.description,
    applicationCategory: "GameApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": PUBLISHER },
    about: { "@type": "VideoGame", name: "Path of Exile" },
  };
}

/** The leveling overlay, which is a download rather than a page. */
export function downloadLd(app: {
  name: string;
  path: string;
  description: string;
  downloadUrl: string;
  version?: string;
}): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: app.name,
    url: canonical(app.path),
    description: app.description,
    downloadUrl: app.downloadUrl,
    softwareVersion: app.version,
    applicationCategory: "GameApplication",
    operatingSystem: "Windows",
    isAccessibleForFree: true,
    license: "https://opensource.org/licenses/MIT",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@id": PUBLISHER },
  };
}

/** Where a page sits, for the trail under a search result. */
export function breadcrumbLd(
  trail: readonly { name: string; path: string }[],
): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: step.name,
      item: canonical(step.path),
    })),
  };
}

export type Faq = { question: string; answer: string };

/**
 * Google stopped drawing these for most sites in 2023, so this is not a play
 * for a rich result. It is here because a question with a short answer under it
 * is the shape an answer engine lifts, and the markup takes the guessing out.
 */
export function faqLd(faqs: readonly Faq[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** The directory itself: what the home page lists, in the order it lists it. */
export function toolListLd(): Ld {
  const listed = [
    // The unlisted ones are on no card of the home page, and structured data
    // that describes a page has to describe the page that is there.
    ...SITE_TOOLS.filter((tool) => !tool.unlisted).map((tool) => ({
      name: tool.label,
      url: canonical(`/${tool.slug}`),
      description: tool.blurb,
    })),
    ...EXTERNAL_TOOLS.map((tool) => ({
      name: tool.name,
      url: tool.href("Standard"),
      description: tool.blurb,
    })),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Path of Exile tools",
    description:
      "The Path of Exile tools worth having, from build planning and loot filters to prices, regex and the labyrinth.",
    numberOfItems: listed.length,
    itemListElement: listed.map((tool, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: tool.name,
      description: tool.description,
      url: tool.url,
    })),
  };
}
