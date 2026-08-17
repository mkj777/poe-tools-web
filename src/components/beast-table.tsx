"use client";

import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronsUpDown,
  Copy,
} from "lucide-react";
import { leagueSlug, type Beast } from "@/lib/ninja";
import { CurrencyIcon, Price } from "@/components/currency";
import {
  MAX_PATTERN_LENGTH,
  type BeastEntry,
  type BestiaryStep,
} from "@/lib/bestiary-regex";
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

type SortKey = "name" | "chaosValue" | "listingCount" | "change";

/** `label` is what the header shows, `name` what a screen reader reads. */
const COLUMNS: {
  key: SortKey;
  name: string;
  label: ReactNode;
  numeric: boolean;
}[] = [
  { key: "name", name: "Beast", label: "Beast", numeric: false },
  { key: "chaosValue", name: "Value", label: "Value", numeric: true },
  { key: "change", name: "7 day change", label: "7d", numeric: true },
  { key: "listingCount", name: "Listings", label: "Listings", numeric: true },
];

/**
 * No listings anywhere. For something that drops there is always someone
 * selling one, so this reads as "the game does not hand this out any more"
 * rather than "it is cheap".
 */
const isNotFound = (beast: Beast) =>
  beast.source === "trade" && !beast.listingCount;

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

type Mode = "sell" | "trash";

/** The thresholds a beast run is actually judged at. */
const PRESETS = [1, 2, 3, 5, 9];

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

  // The count is the number that matters; a wall of names is not.
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

/** One search of the plan: copyable and numbered. */
function StepRow({
  index,
  total,
  step,
}: {
  index: number;
  total: number;
  step: BestiaryStep;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(step.pattern);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">
          {total > 1 ? `Search ${index + 1} of ${total}` : "Search"}
        </h3>
        <span className="text-muted-foreground text-sm tabular-nums">
          {step.covers.length} beasts · {step.pattern.length}/
          {MAX_PATTERN_LENGTH} chars
        </span>
      </div>

      <div className="flex gap-2">
        <Input
          readOnly
          value={step.pattern}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 font-mono text-sm"
        />
        <Button variant="secondary" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

function BestiaryRegex({
  beasts,
  threshold,
  mode,
}: {
  beasts: Beast[];
  threshold: number;
  mode: Mode;
}) {
  // Cheap: the planning itself happens in a worker, see useBestiaryPattern.
  const { wanted, unwanted } = useMemo(() => {
    // Genus, family and habitat are separate lines in the Bestiary row, and
    // "^" binds to the start of any one of them.
    const entry = (b: Beast): BeastEntry => ({
      name: b.name,
      lines: (b.baseType ?? "").split("|").filter(Boolean),
    });

    // Beasts nobody has a listing for are out of the picture entirely: the
    // game does not hand them out, so no search can turn one up and there is
    // nothing to protect them from.
    const priced = beasts.filter((b) => b.chaosValue !== undefined);
    const sell = priced.filter((b) => b.chaosValue! >= threshold);
    const trash = priced.filter((b) => b.chaosValue! < threshold);

    return mode === "sell"
      ? { wanted: sell.map(entry), unwanted: trash.map(entry) }
      : { wanted: trash.map(entry), unwanted: sell.map(entry) };
  }, [beasts, threshold, mode]);

  // Trashing throws beasts away, so it may never show an expensive one.
  // Selling only has to put every valuable beast in front of you; a cheap one
  // in the list costs nothing, and insisting on exactness there would cost
  // searches and leave beasts out.
  const exact = mode === "trash";
  const { steps, unreachable, falsePositives, pending } = useBestiaryPattern(
    wanted,
    unwanted,
    exact,
  );

  const idle = threshold <= 0;

  return (
    <div className="bg-card space-y-5 rounded-xl border p-5">
      {/* The header, and with it the help, is there in both states. */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium">
            {idle
              ? "Bestiary regex"
              : mode === "sell"
                ? "Sell beasts"
                : "Trash beasts"}
          </h2>
          {idle ? (
            <p className="text-muted-foreground text-sm">
              Set a minimum{" "}
              <CurrencyIcon
                currency="chaos"
                size={16}
                className="align-middle"
              />{" "}
              value to plan the searches.
            </p>
          ) : (
            !pending && (
              <p className="text-muted-foreground text-sm">
                {exact
                  ? steps.length > 1
                    ? `Too many for one search. Run all ${steps.length} — no step shows anything above the threshold.`
                    : "Nothing above the threshold can show up in this search."
                  : `Every beast at or above the threshold, in ${steps.length === 1 ? "one search" : `${steps.length} searches`}. Cheaper ones may ride along.`}
              </p>
            )
          )}
        </div>
        <HelpTip beasts={beasts} />
      </div>

      {idle ? null : pending ? (
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-44" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 w-24 shrink-0" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {steps.map((step, i) => (
            <StepRow
              key={step.pattern}
              index={i}
              total={steps.length}
              step={step}
            />
          ))}

          {steps.length === 0 && (
            <p className="text-sm text-amber-500">
              Nothing to select at this threshold.
            </p>
          )}

          {unreachable.length > 0 && (
            <Notice
              tone="red"
              text={`No search can single out ${unreachable.length} of them — a beast you are keeping carries the same name as a line of its own, so handle these by hand:`}
            >
              {unreachable}
            </Notice>
          )}

          {falsePositives.length > 0 && (
            <Notice
              tone="amber"
              text={`Also brings up ${falsePositives.length} beast${falsePositives.length === 1 ? "" : "s"} below the threshold — harmless when you are picking what to sell:`}
            >
              {falsePositives}
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}

/** Everything worth explaining, out of the way until asked for. */
function HelpTip({ beasts }: { beasts: Beast[] }) {
  const fromNinja = beasts.filter((b) => b.source === "ninja").length;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          aria-label="What this is and how the patterns work"
          className="text-foreground border-foreground/40 bg-secondary hover:bg-foreground hover:text-background mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border font-medium transition-colors"
        >
          ?
        </TooltipTrigger>
        {/* One child: the content itself is a flex row, so several would
            become columns. */}
        <TooltipContent
          side="left"
          className="max-h-[85vh] max-w-[26rem] overflow-y-auto py-2.5 text-[13px] leading-relaxed"
        >
          <div className="space-y-2">
            <p>
              <span className="font-medium">Beast Prices.</span> Every beast,
              priced by poe.ninja where it has data and by the trade site
              everywhere else. Pick a threshold and a mode, then paste each
              search into the Bestiary in turn.
            </p>
            <p>
              <span className="font-medium">The in-game search</span> is a real
              regex engine — <code>|</code> <code>.</code> <code>^</code>{" "}
              <code>$</code> <code>[^x]</code> <code>(?!…)</code> work,{" "}
              <code>!</code> and quotes do not, a space acts as <code>.</code>.
              It matches <strong>per line</strong>, and a row has more lines than
              the type name: genus, family, the modifiers that capture rolled,
              and its random name. Hence surprise hits — <code>rar</code> sits
              inside &ldquo;Tempo<em>rar</em>ily Revives&rdquo;, which any beast
              can roll.
            </p>
            <p>
              <span className="font-medium">So a fragment is refused</span> if it
              could land in a modifier name or in any of the 35,237 generated
              names, and an unanchored one needs six characters.{" "}
              <code>^goatman$</code> pins a whole line, the only way to separate
              &ldquo;Goatman&rdquo; from &ldquo;Goatman Fire-raiser&rdquo;. Past
              249 characters you get a second search, never a truncated one.
            </p>
            <p>
              <span className="font-medium">Trash and Sell are opposites.</span>{" "}
              Trash is destructive, so no search may ever show a beast above the
              threshold. Sell only needs every valuable beast on screen, so a
              cheap one riding along is fine. Negation would fix trashing in one
              line, but a row returns as soon as any other line matches.
            </p>
            <p>
              <span className="font-medium">Bestiary Sim</span> tries a pattern
              against every listed beast, rolled and priced, so an expensive
              beast in a trash pattern shows up before it is gone.
            </p>
            <p className="text-muted-foreground">
              {beasts.length} beasts, {fromNinja} from poe.ninja. No listing
              anywhere means the beast is gone, not cheap, so those are left out.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BeastTable({
  beasts,
  league,
}: {
  beasts: Beast[];
  /** poe.ninja detail pages live under the league, so links need it. */
  league: string;
}) {
  const [query, setQuery] = useState("");
  const [minChaos, setMinChaos] = useState("");
  const [sort, setSort] = useState<SortKey>("chaosValue");
  const [desc, setDesc] = useState(true);
  const [showNotFound, setShowNotFound] = useState(false);
  const [mode, setMode] = useState<Mode>("trash");

  const threshold = Number(minChaos) || 0;

  // Anything that drops is being sold by someone. A beast the trade site
  // returns nothing for is not a cheap beast, it is one the game no longer
  // hands out — so it stays out of the table and out of both patterns.
  const found = useMemo(() => beasts.filter((b) => !isNotFound(b)), [beasts]);
  const listed = showNotFound ? beasts : found;

  const worthKeeping = useMemo(
    () => listed.filter((b) => (b.chaosValue ?? 0) >= threshold),
    [listed, threshold],
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

  const notFoundCount = beasts.length - found.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-secondary/60 flex rounded-full p-1">
          {(["trash", "sell"] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMode(option)}
              aria-pressed={mode === option}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                mode === option
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option === "trash" ? "Trash beasts" : "Sell beasts"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="min-chaos"
            className="text-muted-foreground flex items-center gap-1.5"
          >
            Min
            <CurrencyIcon currency="chaos" size={20} />
          </label>

          {/* The thresholds worth farming at, one click away. */}
          <div className="bg-secondary/60 flex rounded-full p-1">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMinChaos(String(preset))}
                aria-pressed={threshold === preset}
                className={`w-9 rounded-full py-1.5 text-sm tabular-nums transition-colors ${
                  threshold === preset
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          <Input
            id="min-chaos"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={minChaos}
            onChange={(e) => setMinChaos(e.target.value)}
            placeholder="0"
            // No spinner: the arrows are useless at these ranges and steal room.
            className="h-11 w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        <span className="text-muted-foreground text-sm">
          {threshold > 0 ? (
            mode === "sell" ? (
              <>
                Every beast worth <Price value={threshold} size={15} /> and
                above, cheap ones allowed to ride along.
              </>
            ) : (
              <>
                Only beasts worth less than{" "}
                <Price value={threshold} size={15} />.
              </>
            )
          ) : (
            "Set a threshold to plan the searches."
          )}
        </span>
      </div>

      <BestiaryRegex beasts={found} threshold={threshold} mode={mode} />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search beast, genus or habitat…"
          className="h-11 max-w-xs"
        />
        {notFoundCount > 0 && (
          <button
            type="button"
            onClick={() => setShowNotFound((v) => !v)}
            aria-pressed={showNotFound}
            className={`flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition-colors ${
              showNotFound
                ? "border-foreground/30 bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            <span
              className={`flex size-4 items-center justify-center rounded-[4px] border ${
                showNotFound ? "bg-foreground text-background" : ""
              }`}
            >
              {showNotFound && <Check className="size-3" strokeWidth={3} />}
            </span>
            {notFoundCount} not found
          </button>
        )}
        <span className="text-muted-foreground tabular-nums">
          {rows.length} of {listed.length} beasts
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
                      aria-label={`Sort by ${col.name}`}
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
                      {/* The minimap marker, not the item icon — every beast
                          shares the same orb, but red versus yellow is the
                          thing worth seeing at a glance. */}
                      <Image
                        src={
                          beast.rarity === "red"
                            ? "/BestiaryLegendaryBeast.webp"
                            : "/BestiaryRareMonster.webp"
                        }
                        alt={beast.rarity === "red" ? "Red beast" : "Yellow beast"}
                        title={
                          beast.rarity === "red"
                            ? "Red beast — two mods, cannot spawn normally"
                            : "Yellow beast"
                        }
                        width={26}
                        height={26}
                        className="shrink-0"
                      />
                      <div className="min-w-0">
                        {beast.detailsId ? (
                          <a
                            href={`https://poe.ninja/poe1/economy/${leagueSlug(league)}/beasts/${beast.detailsId}`}
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
                            (isNotFound(beast)
                              ? "not found"
                              : "priced from the trade site")}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {beast.chaosValue === undefined ? (
                      <span className="tabular-nums">—</span>
                    ) : (
                      <Price value={beast.chaosValue} size={17} />
                    )}
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
