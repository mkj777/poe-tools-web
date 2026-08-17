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
}: {
  leagues: League[];
  value: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={value}
      onValueChange={(id) => router.push(`/${leagueSlug(id)}`)}
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
