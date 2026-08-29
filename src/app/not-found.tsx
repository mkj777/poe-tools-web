import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageFrame, PageHeader } from "@/components/page-frame";

/**
 * Reached by a league slug that is no league, and by the odd link from when
 * every URL here began with one. The sidebar is already on screen, so this page
 * only has to say what happened and point at the one tool that has no league to
 * get wrong.
 */
export const metadata = {
  title: "Nothing here",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PageFrame>
      <PageHeader
        title="Nothing here"
        description="That page does not exist. If you followed an old link, the tools have moved: a league is only part of the URL where prices are, and it is picked on the page now."
        actions={
          <Button asChild>
            <Link href="/">Go to the beasts</Link>
          </Button>
        }
      />
    </PageFrame>
  );
}
