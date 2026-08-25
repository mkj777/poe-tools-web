"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  COMMON_GROUP_IDS,
  MOD_GROUPS,
  PRESETS,
  looseLines,
} from "@/lib/map-mod-groups";
import { planMapSearch } from "@/lib/map-regex";

/**
 * A modifier no curated group speaks for is its own ban, so it takes the same
 * shape and wears its own text as the label. That way one list can hold both
 * and nothing is ever unreachable.
 */
const LOOSE = looseLines().map((line) => ({
  id: line,
  label: line.replace(/#/g, "x"),
  lines: [line] as readonly string[],
}));

const ALL = [...MOD_GROUPS, ...LOOSE];

export function MapSearch() {
  const [banned, setBanned] = useState<string[]>([
    "reflect",
    "no-regen",
    "no-leech",
  ]);
  const [showAll, setShowAll] = useState(false);
  const [copied, setCopied] = useState(false);

  const plan = useMemo(() => {
    const chosen = new Set(banned);
    return planMapSearch(
      ALL.filter((g) => chosen.has(g.id)).flatMap((g) => [...g.lines]),
    );
  }, [banned]);

  const toggle = (id: string) =>
    setBanned((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const copy = async () => {
    await navigator.clipboard.writeText(plan.search);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shown = showAll
    ? ALL
    : MOD_GROUPS.filter((g) => COMMON_GROUP_IDS.includes(g.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Button
            key={preset.id}
            variant="outline"
            size="sm"
            onClick={() =>
              setBanned((prev) => [...new Set([...prev, ...preset.groups])])
            }
          >
            {preset.label}
          </Button>
        ))}
        <Button variant="ghost" size="sm" onClick={() => setBanned([])}>
          Clear
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {shown.map((group) => (
          <label
            key={group.id}
            className="hover:bg-muted/50 flex items-start gap-3 rounded-md border p-3 text-sm"
          >
            <Checkbox
              checked={banned.includes(group.id)}
              onCheckedChange={() => toggle(group.id)}
              className="mt-0.5"
            />
            <span>{group.label}</span>
          </label>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
        {showAll ? "Show the common ones only" : `Show all ${ALL.length}`}
      </Button>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <code className="bg-muted min-h-10 flex-1 rounded-md px-3 py-2 font-mono text-sm break-all">
            {plan.search || "Pick something to ban."}
          </code>
          <Button onClick={copy} disabled={!plan.search} size="icon">
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="text-muted-foreground text-sm">
          {plan.search.length} characters, {plan.fragments.length} fragments.
          Everything still lit is safe to run.
        </p>
        {plan.unreachable.length > 0 && (
          <p className="text-destructive text-sm">
            No fragment can single these out without hiding maps you can run:{" "}
            {plan.unreachable.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}
