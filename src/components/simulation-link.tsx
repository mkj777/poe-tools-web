import Link from "next/link";
import { FlaskConical } from "lucide-react";

/** Into the Bestiary mock-up, where a pattern can be tried without the game. */
export function SimulationLink({
  league,
  pattern,
}: {
  league: string;
  pattern?: string;
}) {
  const query = new URLSearchParams({ league });
  if (pattern) query.set("q", pattern);

  return (
    <Link
      href={`/simulation?${query}`}
      className="bg-secondary/60 hover:bg-secondary text-foreground flex h-10 w-full items-center justify-center gap-2 rounded-md border text-sm font-medium transition-colors"
    >
      <FlaskConical className="size-4" />
      Bestiary Sim
    </Link>
  );
}
