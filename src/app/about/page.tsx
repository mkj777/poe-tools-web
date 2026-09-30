import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FaqSection } from "@/components/faq-section";
import { JsonLd } from "@/components/json-ld";
import { PageFrame, PageHeader } from "@/components/page-frame";
import { ToolIcon } from "@/components/tool-icon";
import { FAQ_GROUPS } from "@/lib/faq";
import { guideFor } from "@/lib/guides";
import { toolBySlug } from "@/lib/nav";
import { breadcrumbLd, faqLd } from "@/lib/seo";
import { AUTHOR, OG_IMAGE, SITE_NAME, canonical } from "@/lib/site";

const TITLE = "About and FAQ";
const DESCRIPTION =
  "What Path of Tools is, how to use Beast Regex, Scarab Nodes, Map Regex and the PoE Leveling Guide, and the questions players ask about each.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/about" },
  openGraph: {
    url: canonical("/about"),
    title: `About ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

/**
 * The one page of prose on the site.
 *
 * The tool pages are the tools and nothing else. Whatever explains them, what
 * each one does, how a session goes, and the questions people ask, is here,
 * grouped by tool, with one FAQPage block for all of it. Built once: nothing
 * on it comes from the network.
 */
export default function Page() {
  return (
    <PageFrame>
      <JsonLd data={faqLd(FAQ_GROUPS.flatMap((group) => group.faqs))} />
      <JsonLd
        data={breadcrumbLd([
          { name: "Path of Exile tools", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      <div className="mx-auto max-w-3xl">
        <PageHeader title={`About ${SITE_NAME}`} />

        <div className="text-muted-foreground space-y-3 text-sm text-pretty">
          <p>
            {SITE_NAME} is a free directory of the Path of Exile tools worth
            having: the trade site, loot filters, build planners, price
            checkers, regex generators and guides, each with a sentence on what
            it is for. A few are built here: Beast Regex for selling Bestiary
            captures, Scarab Nodes for pricing the scarab passives of the Atlas
            tree, Map Regex for filtering maps in the stash, and the PoE
            Leveling Guide, a campaign overlay for Windows.
          </p>
          <p>
            No account, no ads, nothing stored about you. Built by{" "}
            <a
              href={AUTHOR.url}
              rel="author"
              className="text-foreground underline underline-offset-4"
            >
              {AUTHOR.name}
            </a>
            .
          </p>
        </div>

        <nav
          aria-label="On this page"
          className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm"
        >
          {FAQ_GROUPS.map((group) => (
            <a
              key={group.id}
              href={`#${group.id}`}
              className="text-muted-foreground hover:text-foreground underline-offset-4 transition-colors hover:underline"
            >
              {group.title}
            </a>
          ))}
        </nav>

        {FAQ_GROUPS.map((group) => {
          const tool = toolBySlug(group.id);
          const guide = tool && guideFor(tool.slug);

          return (
            <section
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-title`}
              className="border-border/60 mt-10 scroll-mt-20 border-t pt-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2
                  id={`${group.id}-title`}
                  className="flex items-center gap-2.5 text-lg font-semibold tracking-tight"
                >
                  {tool && <ToolIcon icon={tool.icon} className="size-6" />}
                  {guide ? guide.title : `${group.title} questions`}
                </h2>
                {tool && (
                  <Link
                    href={`/${tool.slug}`}
                    className="text-primary inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                  >
                    Open {tool.label}
                    <ArrowRight className="size-3.5" />
                  </Link>
                )}
              </div>

              {guide && (
                <>
                  <div className="text-muted-foreground mt-3 space-y-3 text-sm text-pretty">
                    {guide.about.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <h3 className="mt-5 mb-2 text-sm font-medium">
                    How to use it
                  </h3>
                  <ol className="text-muted-foreground list-decimal space-y-1.5 pl-5 text-sm text-pretty">
                    {guide.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  <h3 className="mt-6 mb-1 text-sm font-medium">Questions</h3>
                </>
              )}

              <FaqSection
                group={group.id}
                faqs={group.faqs}
                className={guide ? undefined : "mt-3"}
              />
            </section>
          );
        })}
      </div>
    </PageFrame>
  );
}
