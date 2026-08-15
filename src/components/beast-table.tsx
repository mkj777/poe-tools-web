"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Copy } from "lucide-react";
import type { Beast } from "@/lib/ninja";
import { buildBestiaryRegex } from "@/lib/bestiary-regex";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SortKey = "name" | "chaosValue" | "divineValue" | "listingCount" | "change";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Beast", numeric: false },
  { key: "chaosValue", label: "Chaos", numeric: true },
  { key: "divineValue", label: "Divine", numeric: true },
  { key: "change", label: "7d", numeric: true },
  { key: "listingCount", label: "Listings", numeric: true },
];

function sortValue(beast: Beast, key: SortKey) {
  if (key === "name") return beast.name;
  if (key === "change") return beast.sparkLine?.totalChange ?? 0;
  return beast[key] ?? 0;
}

const num = (value: number | undefined, digits = 0) =>
  (value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * Characters the Bestiary search accepts. GGG raised the global search limit
 * from 50 to 250; the Bestiary window trailed behind at 100 for a while, so
 * bump this down if a pasted pattern ever gets cut off.
 */
const SEARCH_FIELD_LIMIT = 250;

function BestiaryRegex({
  beasts,
  threshold,
  kept,
}: {
  beasts: Beast[];
  threshold: number;
  kept: Beast[];
}) {
  const [copied, setCopied] = useState(false);

  const { pattern, overmatched } = useMemo(() => {
    if (threshold <= 0 || kept.length === 0)
      return { pattern: "", overmatched: [] };
    const keptIds = new Set(kept.map((b) => b.id));
    return buildBestiaryRegex(
      kept.map((b) => b.name),
      beasts.filter((b) => !keptIds.has(b.id)).map((b) => b.name),
    );
  }, [beasts, kept, threshold]);

  async function copy() {
    await navigator.clipboard.writeText(pattern);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const tooLong = pattern.length > SEARCH_FIELD_LIMIT;

  return (
    <div className="bg-card space-y-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Bestiary regex</h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {threshold > 0
            ? `matches ${kept.length} beasts ≥ ${threshold}c · ${pattern.length} chars`
            : "set a min chaos value to generate one"}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          readOnly
          value={pattern}
          placeholder="—"
          onFocus={(e) => e.currentTarget.select()}
          className={`h-11 font-mono text-sm ${tooLong ? "border-amber-500/60" : ""}`}
        />
        <Button
          variant="secondary"
          onClick={copy}
          disabled={!pattern}
          className="shrink-0"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <p className="text-muted-foreground text-sm">
        Paste into the Bestiary search to show only beasts worth at least the min
        chaos value.
      </p>

      {tooLong && (
        <p className="text-sm text-amber-500">
          Longer than the {SEARCH_FIELD_LIMIT}-character search box — raise the
          min chaos value or split it across two searches.
        </p>
      )}

      {overmatched.length > 0 && (
        <p className="text-sm text-amber-500">
          Also matches {overmatched.length} cheaper{" "}
          {overmatched.length === 1 ? "beast" : "beasts"} whose name cannot be
          told apart by a substring: {overmatched.join(", ")}.
        </p>
      )}
    </div>
  );
}

export function BeastTable({ beasts }: { beasts: Beast[] }) {
  const [query, setQuery] = useState("");
  const [minChaos, setMinChaos] = useState("");
  const [sort, setSort] = useState<SortKey>("chaosValue");
  const [desc, setDesc] = useState(true);

  const threshold = Number(minChaos) || 0;

  const worthKeeping = useMemo(
    () => beasts.filter((b) => (b.chaosValue ?? 0) >= threshold),
    [beasts, threshold],
  );

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? worthKeeping.filter(
          (b) =>
            b.name.toLowerCase().includes(needle) ||
            (b.baseType ?? "").toLowerCase().includes(needle),
        )
      : worthKeeping;

    return [...filtered].sort((a, b) => {
      const x = sortValue(a, sort);
      const y = sortValue(b, sort);
      const cmp =
        typeof x === "string" && typeof y === "string"
          ? x.localeCompare(y)
          : Number(x) - Number(y);
      return desc ? -cmp : cmp;
    });
  }, [worthKeeping, query, sort, desc]);

  function toggle(key: SortKey) {
    if (key === sort) {
      setDesc((d) => !d);
    } else {
      setSort(key);
      setDesc(key !== "name");
    }
  }

  return (
    <div className="space-y-5">
      <BestiaryRegex beasts={beasts} threshold={threshold} kept={worthKeeping} />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search beast, genus or habitat…"
          className="h-11 max-w-xs"
        />
        <div className="flex items-center gap-2">
          <label htmlFor="min-chaos" className="text-muted-foreground">
            Min chaos
          </label>
          <Input
            id="min-chaos"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={minChaos}
            onChange={(e) => setMinChaos(e.target.value)}
            placeholder="0"
            className="h-11 w-24"
          />
        </div>
        <span className="text-muted-foreground tabular-nums">
          {rows.length} of {beasts.length} beasts
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((col) => {
                const active = sort === col.key;
                const Icon = !active ? ChevronsUpDown : desc ? ArrowDown : ArrowUp;
                return (
                  <TableHead
                    key={col.key}
                    className={col.numeric ? "text-right" : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(col.key)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${
                        active ? "text-foreground font-medium" : ""
                      } ${col.numeric ? "flex-row-reverse" : ""}`}
                    >
                      <Icon className="size-4 opacity-70" />
                      {col.label}
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((beast) => {
              const change = beast.sparkLine?.totalChange ?? 0;
              const traits = (beast.baseType ?? "").split("|").filter(Boolean);
              return (
                <TableRow key={beast.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {beast.icon ? (
                        <Image
                          src={beast.icon}
                          alt=""
                          width={34}
                          height={34}
                          className="shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="size-[34px] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <a
                          href={`https://poe.ninja/poe1/economy/beasts/${beast.detailsId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline"
                        >
                          {beast.name}
                        </a>
                        <div className="text-muted-foreground truncate text-sm">
                          {traits.join(" · ")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(beast.chaosValue, (beast.chaosValue ?? 0) < 10 ? 1 : 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(beast.divineValue, 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Badge
                      variant="secondary"
                      className={`text-sm ${
                        change > 0
                          ? "text-emerald-500"
                          : change < 0
                            ? "text-red-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {change > 0 ? "+" : ""}
                      {num(change, 1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {num(beast.listingCount)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
