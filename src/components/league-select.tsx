"use client";

import { useRouter } from "next/navigation";
import { leagueSlug, type League } from "@/lib/ninja";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeagueSelect({
  leagues,
  value,
  className = "w-[220px]",
  to = (slug: string) => `/${slug}`,
}: {
  leagues: League[];
  value: string;
  className?: string;
  /** Where picking a league leads. The bar keeps the current tool. */
  to?: (slug: string) => string;
}) {
  const router = useRouter();

  return (
    <Select
      value={value}
      onValueChange={(id) => router.push(to(leagueSlug(id)))}
    >
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {leagues.map((l) => (
          <SelectItem key={l.id} value={l.id}>
            {l.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
