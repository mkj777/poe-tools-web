import { JsonLd } from "@/components/json-ld";
import { faqLd, type Faq } from "@/lib/seo";

/**
 * The questions a page gets, under the tool that answers them.
 *
 * It sits below the work rather than above it, because nobody arriving to build
 * a search wants to read first. What it is for is the visit that came from a
 * question typed into a search box, and for the engines that now answer such a
 * question themselves: both want the wording of the question and a short answer
 * they can take whole, and neither can use text that is hidden behind a click,
 * so nothing here collapses.
 */
export function FaqSection({
  faqs,
  heading = "Questions",
  className,
}: {
  faqs: readonly Faq[];
  heading?: string;
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby="faq">
      <JsonLd data={faqLd(faqs)} />
      <h2
        id="faq"
        className="text-muted-foreground mb-4 text-xs font-medium tracking-wider uppercase"
      >
        {heading}
      </h2>
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        {faqs.map((faq) => (
          <div key={faq.question} className="min-w-0">
            <dt className="text-sm font-medium text-pretty">{faq.question}</dt>
            <dd className="text-muted-foreground mt-1.5 text-sm text-pretty">
              {faq.answer}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
