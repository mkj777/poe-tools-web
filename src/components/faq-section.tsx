import { faqAnchor } from "@/lib/faq";
import type { Faq } from "@/lib/seo";

/**
 * One group of questions on the about page, the only page that shows any.
 *
 * Each question is an anchor, `faq-<group>-<n>` numbered in the order it is
 * asked, which is where the palette sends a reader who searched for one. The
 * offset clears the bar a phone keeps at the top, and the one that was asked
 * for is lit. The FAQPage markup is not here: the page emits one block for all
 * of its groups, since one URL should carry one FAQPage.
 */
export function FaqSection({
  group,
  faqs,
  className,
}: {
  group: string;
  faqs: readonly Faq[];
  className?: string;
}) {
  return (
    <dl className={className}>
      {faqs.map((faq, i) => (
        <div
          key={faq.question}
          id={faqAnchor(group, i)}
          className="min-w-0 scroll-mt-20 rounded-md py-2 transition-colors target:bg-accent/40 target:-mx-2 target:px-2 motion-reduce:transition-none"
        >
          <dt className="text-sm font-medium text-pretty">{faq.question}</dt>
          <dd className="text-muted-foreground mt-1 text-sm text-pretty">
            {faq.answer}
          </dd>
        </div>
      ))}
    </dl>
  );
}
