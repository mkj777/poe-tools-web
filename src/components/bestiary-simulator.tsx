"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Beast } from "@/lib/ninja";
import {
  MAX_PATTERN_LENGTH,
  matchingFragments,
} from "@/lib/bestiary-regex";
import { Input } from "@/components/ui/input";
import { CurrencyIcon, Price } from "@/components/currency";

/** What the Bestiary row shows: type name, then genus, family, habitat. */
const rowOf = (beast: Beast) => [
  beast.name,
  ...(beast.baseType ?? "").split("|").filter(Boolean),
];

type Row = {
  beast: Beast;
  lines: string[];
  hits: { fragment: string; line: string }[];
};

function Tile({ row, danger }: { row: Row; danger: boolean }) {
  const { beast, lines, hits } = row;

  return (
    <div
      className={`bg-card flex gap-3 rounded-xl border p-3 ${
        danger ? "border-red-500/70 bg-red-950/20" : ""
      }`}
    >
      <Image
        src={
          beast.rarity === "red"
            ? "/BestiaryLegendaryBeast.webp"
            : "/BestiaryRareMonster.webp"
        }
        alt={beast.rarity === "red" ? "Red beast" : "Yellow beast"}
        width={26}
        height={26}
        className="mt-0.5 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{beast.name}</span>
          <Price
            value={beast.chaosValue ?? 0}
            size={15}
            className={danger ? "text-red-400" : "text-foreground"}
          />
        </div>
        <div className="text-muted-foreground truncate text-sm">
          {lines.slice(1).join(" · ") || "no genus data"}
        </div>
        {hits.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {hits.map((hit) => (
              <span
                key={hit.fragment}
                title={`matched on "${hit.line}"`}
                className="bg-secondary text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs"
              >
                {hit.fragment}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The Bestiary window, near enough to test a pattern against.
 *
 * Every beast with a listing is in here with the lines the game searches, so
 * pasting a pattern shows what the Bestiary would show — with the price on each
 * tile, which is the thing the game will not tell you. A trash pattern that
 * turns up something expensive is a bug you can see immediately instead of
 * finding out after the beast is gone.
 */
export function BestiarySimulator({
  beasts,
  initialPattern = "",
}: {
  beasts: Beast[];
  initialPattern?: string;
}) {
  const [pattern, setPattern] = useState(initialPattern);
  const [dangerAbove, setDangerAbove] = useState("");
  const [showRest, setShowRest] = useState(false);

  const limit = Number(dangerAbove) || 0;

  const { matched, rest } = useMemo(() => {
    const rows: Row[] = beasts.map((beast) => ({
      beast,
      lines: rowOf(beast),
      hits: [],
    }));

    const trimmed = pattern.trim();
    if (!trimmed) return { matched: [], rest: rows };

    const matched: Row[] = [];
    const rest: Row[] = [];
    for (const row of rows) {
      const hits = matchingFragments(trimmed, row.lines);
      if (hits.length > 0) matched.push({ ...row, hits });
      else rest.push(row);
    }

    const byValue = (a: Row, b: Row) =>
      (b.beast.chaosValue ?? 0) - (a.beast.chaosValue ?? 0);
    return { matched: matched.sort(byValue), rest: rest.sort(byValue) };
  }, [beasts, pattern]);

  const worst = matched[0]?.beast;
  const over = limit > 0 ? matched.filter((r) => (r.beast.chaosValue ?? 0) >= limit) : [];

  return (
    <div className="space-y-5">
      <div className="bg-card space-y-3 rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Paste a Bestiary search…"
            spellCheck={false}
            className="h-11 min-w-0 flex-1 font-mono text-sm"
          />
          <span
            className={`text-sm tabular-nums ${
              pattern.length > MAX_PATTERN_LENGTH
                ? "text-red-500"
                : "text-muted-foreground"
            }`}
          >
            {pattern.length}/{MAX_PATTERN_LENGTH}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {pattern.trim()
              ? `${matched.length} of ${beasts.length} beasts shown`
              : `${beasts.length} beasts, no search`}
          </span>

          <span className="text-muted-foreground flex items-center gap-2">
            Warn at
            <Input
              type="number"
              min={0}
              value={dangerAbove}
              onChange={(e) => setDangerAbove(e.target.value)}
              placeholder="0"
              aria-label="Warn about matches worth this much or more"
              className="h-9 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <CurrencyIcon currency="chaos" size={16} />
            and up
          </span>

          {worst && (
            <span className="text-muted-foreground flex items-center gap-1">
              dearest match
              <Price value={worst.chaosValue ?? 0} size={15} />
              <span className="text-foreground">{worst.name}</span>
            </span>
          )}
        </div>

        {over.length > 0 && (
          <p className="text-sm text-red-500">
            {over.length} match{over.length === 1 ? "" : "es"} at or above the
            warning line:{" "}
            <span className="font-medium text-red-300">
              {over
                .slice(0, 10)
                .map((r) => r.beast.name)
                .join(", ")}
              {over.length > 10 && ` … and ${over.length - 10} more`}
            </span>
          </p>
        )}

        <p className="text-muted-foreground text-sm">
          Searched here: type name, genus, family, habitat. A captured beast
          also carries the name the game generated for it and up to three
          modifiers with their descriptions — those are not in this data, so a
          pattern that looks clean here can still hit one of those in game.
        </p>
      </div>

      {matched.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {matched.map((row) => (
            <Tile
              key={row.beast.name}
              row={row}
              danger={limit > 0 && (row.beast.chaosValue ?? 0) >= limit}
            />
          ))}
        </div>
      )}

      {pattern.trim() && matched.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Nothing matches — the Bestiary would show an empty list.
        </p>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowRest((v) => !v)}
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
        >
          {showRest ? "Hide" : "Show"} the {rest.length} beasts that stay hidden
        </button>

        {showRest && (
          <div className="grid gap-3 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((row) => (
              <Tile key={row.beast.name} row={row} danger={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
