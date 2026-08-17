import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { leagueSlug } from "@/lib/ninja";

/** Into the Bestiary mock-up, where a pattern can be tried without the game. */
export function SimulationLink({ league }: { league: string }) {
  return (
    <Link
      href={`/${leagueSlug(league)}/simulation`}
      className="bg-secondary/60 hover:bg-secondary text-foreground flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors"
    >
      <FlaskConical className="size-4" />
      Bestiary Sim
    </Link>
  );
}
