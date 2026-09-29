import { guideFor } from "@/lib/guides";

/**
 * What a tool does and how a session with it goes, in prose, under the tool.
 *
 * Like the questions beneath it, it sits below the work rather than above it
 * and never collapses: a visitor who came to use the tool does not have to
 * scroll past it, and a reader who came from a search, or an engine writing
 * an answer, finds it in the HTML without a click.
 */
export function ToolGuide({
  slug,
  steps = true,
  className,
}: {
  slug: string;
  /** Off where the page already shows the steps in a form of its own. */
  steps?: boolean;
  className?: string;
}) {
  const guide = guideFor(slug);

  return (
    <section className={className} aria-labelledby="about">
      <h2
        id="about"
        className="text-muted-foreground mb-4 text-xs font-medium tracking-wider uppercase"
      >
        {guide.title}
      </h2>
      <div className="text-muted-foreground max-w-3xl space-y-3 text-sm text-pretty">
        {guide.about.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
      {steps && (
        <>
          <h3 className="mt-5 mb-2 text-sm font-medium">How to use it</h3>
          <ol className="text-muted-foreground max-w-3xl list-decimal space-y-1.5 pl-5 text-sm text-pretty">
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
