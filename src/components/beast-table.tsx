"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Copy } from "lucide-react";
import type { Beast } from "@/lib/ninja";
import { MAX_PATTERN_LENGTH, type BeastEntry } from "@/lib/bestiary-regex";
import { useBestiaryPattern } from "@/lib/use-bestiary-pattern";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function PatternRow({
  label,
  wanted,
  unwanted,
  extrasLabel,
}: {
  label: string;
  wanted: BeastEntry[];
  unwanted: BeastEntry[];
  extrasLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const { pattern, overmatched, missing, pending } = useBestiaryPattern(
    wanted,
    unwanted,
  );

  async function copy() {
    if (!pattern) return;
    await navigator.clipboard.writeText(pattern);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (pending) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-medium">{label}</h3>
          <Skeleton className="h-5 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1" />
          <Skeleton className="h-11 w-24 shrink-0" />
        </div>
        <Skeleton className="h-5 w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{label}</h3>
        <span className="text-muted-foreground text-sm tabular-nums">
          {pattern
            ? `${wanted.length} beasts · ${pattern.length}/${MAX_PATTERN_LENGTH} chars · ` +
              `${overmatched.length} false positives`
            : `${wanted.length} beasts`}
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          readOnly
          value={pattern ?? ""}
          placeholder="Could not be generated — no pattern fits in 249 characters."
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 font-mono text-sm placeholder:font-sans placeholder:text-amber-500"
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

      {pattern && overmatched.length > 0 && (
        <Notice tone="amber" text={`Also matches ${overmatched.length} ${extrasLabel}:`}>
          {overmatched}
        </Notice>
      )}

      {/* Only meaningful when a pattern exists — a refusal already says it all. */}
      {pattern && missing.length > 0 && (
        <Notice
          tone="red"
          text={`Does not match ${missing.length} of the ${wanted.length} it should:`}
        >
          {missing}
        </Notice>
      )}
    </div>
  );
}

/** Warning line: the sentence and the beast names get their own colours. */
function Notice({
  tone,
  text,
  children,
}: {
  tone: "amber" | "red";
  text: string;
  children: string[];
}) {
  const sentence = tone === "amber" ? "text-amber-600" : "text-red-600";
  const names = tone === "amber" ? "text-amber-300" : "text-red-300";

  // The count is the number that matters; a 139-name wall of text is not.
  const LISTED = 15;
  const shown = children.slice(0, LISTED).join(", ");
  const rest = children.length - LISTED;

  return (
    <p className={`text-sm ${sentence}`}>
      {text}{" "}
      <span className={`${names} font-medium`}>
        {shown}
        {rest > 0 && ` … and ${rest} more`}
      </span>
    </p>
  );
}

function BestiaryRegex({
  beasts,
  threshold,
}: {
  beasts: Beast[];
  threshold: number;
}) {
  // Cheap: the solving itself happens in a worker, see useBestiaryPattern.
  // Three groups. A beast with no price from either source is unknown rather
  // than cheap: no pattern claims it, but both still avoid matching it.
  const { keep, trash, unknown } = useMemo(() => {
    // Genus, family and habitat are separate lines in the Bestiary row, and
    // "^" binds to the start of any one of them.
    const entry = (b: Beast): BeastEntry => ({
      name: b.name,
      lines: (b.baseType ?? "").split("|").filter(Boolean),
    });

    return {
      keep: beasts.filter((b) => (b.chaosValue ?? -1) >= threshold).map(entry),
      trash: beasts
        .filter((b) => b.chaosValue !== undefined && b.chaosValue < threshold)
        .map(entry),
      unknown: beasts.filter((b) => b.chaosValue === undefined).map(entry),
    };
  }, [beasts, threshold]);

  // New arrays every render would restart the worker on every render.
  const notKeep = useMemo(() => [...trash, ...unknown], [trash, unknown]);
  const notTrash = useMemo(() => [...keep, ...unknown], [keep, unknown]);

  if (threshold <= 0) {
    return (
      <div className="bg-card rounded-xl border p-5">
        <h2 className="text-lg font-medium">Bestiary regex</h2>
        <p className="text-muted-foreground text-sm">
          Set a min chaos value to generate search patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card space-y-5 rounded-xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-medium">Bestiary regex</h2>
        <HelpTip beasts={beasts} unknown={unknown.length} />
      </div>

      <PatternRow
        label={`Worth keeping — ${threshold}c and up`}
        wanted={keep}
        unwanted={notKeep}
        extrasLabel="other beasts that no fragment can exclude"
      />

      <PatternRow
        label={`Reverse (Trash) — under ${threshold}c`}
        wanted={trash}
        unwanted={notTrash}
        extrasLabel="other beasts that no fragment can exclude"
      />
    </div>
  );
}

/** Everything worth explaining, out of the way until asked for. */
function HelpTip({ beasts, unknown }: { beasts: Beast[]; unknown: number }) {
  const fromNinja = beasts.filter((b) => b.source === "ninja").length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label="How these patterns work"
          className="text-muted-foreground hover:text-foreground hover:border-foreground/40 mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-sm"
        >
          ?
        </TooltipTrigger>
        {/* One child: the content itself is a flex row, so several would
            become columns. */}
        <TooltipContent side="left" className="max-w-96 py-2.5 text-sm">
          <div className="space-y-2">
            <p>
              Paste the top pattern into the Bestiary search to see only beasts
              worth at least the min chaos value. The second is its inverse, for
              clearing out the cheap ones.
            </p>
            <p>
              The search reads more than the type name: genus, family, the
              up-to-three modifiers a beast carries and their descriptions, plus
              the generated name it was captured under. Fragments that could
              land in any of those are refused — otherwise <code>far</code>{" "}
              would drag in everything holding &ldquo;Farric Presence&rdquo;,
              and a short one could hide inside any of the 35,237 names the game
              can spell.
            </p>
            <p>
              {beasts.length} beasts from GGG&apos;s trade data, {fromNinja}{" "}
              priced by poe.ninja and the rest looked up on the trade site, where
              0c means nobody is selling one.
              {unknown > 0 &&
                ` ${unknown} have no price yet and neither pattern claims them.`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
      <BestiaryRegex beasts={beasts} threshold={threshold} />

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
                        {beast.detailsId ? (
                          <a
                            href={`https://poe.ninja/poe1/economy/beasts/${beast.detailsId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium hover:underline"
                          >
                            {beast.name}
                          </a>
                        ) : (
                          <span className="font-medium">{beast.name}</span>
                        )}
                        <div className="text-muted-foreground truncate text-sm">
                          {traits.join(" · ") ||
                            (beast.chaosValue === undefined
                              ? "price not fetched yet"
                              : beast.listingCount
                                ? "priced from the trade site"
                                : "nobody is selling one")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {beast.chaosValue === undefined
                      ? "—"
                      : num(beast.chaosValue, beast.chaosValue < 10 ? 1 : 0)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {beast.divineValue === undefined
                      ? "—"
                      : num(beast.divineValue, 2)}
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
