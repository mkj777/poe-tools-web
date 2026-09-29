import { llmsFullTxt } from "@/lib/seo";

/**
 * llms.txt plus every question the tool pages answer, at /llms-full.txt.
 *
 * Static: it is built from the catalogue in the repository and from nothing on
 * the network, so it changes when a tool is added and never otherwise.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(llmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400",
    },
  });
}
