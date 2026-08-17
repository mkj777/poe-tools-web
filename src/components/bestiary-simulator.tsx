"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Dices } from "lucide-react";
import type { Beast } from "@/lib/ninja";
import { MAX_PATTERN_LENGTH, matchingFragments } from "@/lib/bestiary-regex";
import { rollCapture, type Capture } from "@/lib/capture";
import { patternRisks } from "@/lib/pattern-risk";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CurrencyIcon, Price } from "@/components/currency";

type Row = {
  beast: Beast;
  capture: Capture;
  hits: { fragment: string; line: string }[];
};

/** A beast the way the Bestiary shows it, plus the price the game will not. */
function Tile({ row, danger }: { row: Row; danger: boolean }) {
  const { beast, capture, hits } = row;

  return (
    <div
      className={`bg-card flex flex-col gap-1.5 rounded-xl border p-3 ${
        danger ? "border-red-500/70 bg-red-950/20" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Image
          src={
            beast.rarity === "red"
              ? "/BestiaryLegendaryBeast.webp"
              : "/BestiaryRareMonster.webp"
          }
          alt={beast.rarity === "red" ? "Red beast" : "Yellow beast"}
          width={22}
          height={22}
          className="shrink-0"
        />
        <span className="truncate font-medium">{capture.name}</span>
        <Price
          value={beast.chaosValue ?? 0}
          size={15}
          className={`ml-auto ${danger ? "text-red-400" : "text-foreground"}`}
        />
      </div>

      <div className="text-muted-foreground text-center text-sm">
        - {capture.type} -
      </div>

      <div className="text-center text-sm leading-snug">
        {capture.bestiaryMods.map((mod) => (
          <div key={mod} className="text-red-400">
            {mod}
          </div>
        ))}
        {capture.monsterMods.map((mod) => (
          <div key={mod} className="text-foreground/80">
            {mod}
          </div>
        ))}
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
  );
}

/**
 * The Bestiary window, near enough to test a pattern against.
 *
 * Every beast with a listing is rolled into a capture — generated name, type,
 * Bestiary modifiers, monster modifiers — and the pattern runs over all of it,
 * the way the game does. Reroll to see other names and other modifiers; the
 * risk panel answers the same question without rolling, by asking whether a
 * fragment could ever land in a generated name or a modifier at all.
 */
export function BestiarySimulator({ beasts }: { beasts: Beast[] }) {
  const [pattern, setPattern] = useState("");
  const [dangerAbove, setDangerAbove] = useState("");
  const [roll, setRoll] = useState(0);
  const [showRest, setShowRest] = useState(false);

  const limit = Number(dangerAbove) || 0;
  const captures = useMemo(
    () => beasts.map((beast) => ({ beast, capture: rollCapture(beast, roll) })),
    [beasts, roll],
  );

  const { matched, rest } = useMemo(() => {
    const trimmed = pattern.trim();
    const byValue = (a: Row, b: Row) =>
      (b.beast.chaosValue ?? 0) - (a.beast.chaosValue ?? 0);

    // An empty search shows the whole Bestiary in game, so it does here too.
    if (!trimmed) {
      return {
        matched: captures.map((c) => ({ ...c, hits: [] })).sort(byValue),
        rest: [] as Row[],
      };
    }

    const matched: Row[] = [];
    const rest: Row[] = [];
    for (const { beast, capture } of captures) {
      const hits = matchingFragments(trimmed, capture.lines);
      if (hits.length > 0) matched.push({ beast, capture, hits });
      else rest.push({ beast, capture, hits: [] });
    }
    return { matched: matched.sort(byValue), rest: rest.sort(byValue) };
  }, [captures, pattern]);

  const risks = useMemo(
    () => (pattern.trim() ? patternRisks(pattern.trim()) : []),
    [pattern],
  );

  const worst = matched[0]?.beast;
  const over =
    limit > 0 ? matched.filter((r) => (r.beast.chaosValue ?? 0) >= limit) : [];

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
          <Button
            variant="secondary"
            onClick={() => setRoll((r) => r + 1)}
            title="Roll new names and modifiers for every beast"
            className="shrink-0"
          >
            <Dices className="size-4" />
            Reroll
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground tabular-nums">
            {pattern.trim()
              ? `${matched.length} of ${beasts.length} beasts shown`
              : `all ${beasts.length} beasts, no search`}
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

        {risks.length > 0 && (
          <div className="space-y-1 rounded-lg border border-red-500/40 bg-red-950/20 p-3 text-sm">
            <p className="font-medium text-red-400">
              These fragments can match a capture of any beast, whatever this
              roll happens to show:
            </p>
            {risks.map((risk) => (
              <p key={risk.fragment} className="text-muted-foreground">
                <code className="text-foreground font-mono">
                  {risk.fragment}
                </code>{" "}
                lands in the {risk.kind}{" "}
                <span className="text-red-300">{risk.example}</span>
              </p>
            ))}
          </div>
        )}

        <p className="text-muted-foreground text-sm">
          Names and modifiers are rolled per beast, the way the game rolls them
          on capture: a prefix and a suffix word, sometimes a title, three
          Bestiary modifiers on a red beast and one on a yellow, plus a few
          ordinary monster modifiers. Reroll for a different draw — the risk
          panel above covers every draw at once.
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

      {rest.length > 0 && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowRest((v) => !v)}
            className="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
          >
            {showRest ? "Hide" : "Show"} the {rest.length} beasts that stay
            hidden
          </button>

          {showRest && (
            <div className="grid gap-3 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((row) => (
                <Tile key={row.beast.name} row={row} danger={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
