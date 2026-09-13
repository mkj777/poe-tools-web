import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-frame";
import { LEVELING_APP } from "@/lib/leveling-app";

/**
 * What the leveling page opens with. Nothing in it comes from the network,
 * so the loading state draws the whole of it and only the screenshot and the
 * steps below wait.
 */
export function LevelingHeader() {
  return (
    <PageHeader
      title={
        <span className="flex items-center gap-3">
          <Image
            src="/poe_leveling_guide_icon.png"
            alt=""
            width={128}
            height={128}
            className="size-9 shrink-0 rounded-lg"
          />
          PoE Leveling Guide
        </span>
      }
      description={
        <>
          Follows your progress and shows the next step by itself.
          <span className="block">For a quicker Campaign.</span>
        </>
      }
      actions={
        <div className="flex flex-col items-start gap-1 sm:items-end">
          {/* The one thing on the page worth a button. Bigger than any size
              the variants carry, because it is the whole point of the tab. */}
          <Button asChild size="lg" className="h-12 gap-2.5 px-6 text-base">
            <a href={LEVELING_APP.setup}>
              <Download className="size-5" />
              Download for Windows
            </a>
          </Button>
          <span className="flex gap-1">
            <Button asChild variant="link" size="sm" className="h-9 underline">
              <a href={LEVELING_APP.portable}>Portable zip</a>
            </Button>
            <Button asChild variant="link" size="sm" className="h-9 underline">
              <a
                href={LEVELING_APP.repo}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </Button>
          </span>
        </div>
      }
    />
  );
}
