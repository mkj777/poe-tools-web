/**
 * A block of schema.org for the crawlers that read it.
 *
 * The angle bracket is escaped because the payload ends up inside a script tag,
 * where a `</script>` in any string would close it and turn the rest of the
 * page into markup somebody else wrote.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
