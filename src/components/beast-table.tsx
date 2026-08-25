"use client";

import { useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Copy } from "lucide-react";
import { leagueSlug, type Beast } from "@/lib/ninja";
import { CurrencyIcon, Price } from "@/components/currency";
import {
  MAX_PATTERN_LENGTH,
  type BeastEntry,
  type BestiaryStep,
} from "@/lib/bestiary-regex";
import {
  useBestiaryPattern,
  type PatternState,
} from "@/lib/use-bestiary-pattern";
import {
  BAND_MIN,
  PRESET_THRESHOLDS,
  inBand,
  presetKey,
  type PresetPlans,
} from "@/lib/preset-plans";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { num } from "@/lib/utils";
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

type Mode = "sell" | "trash";

/** The thresholds a beast run is actually judged at — the server has already
    planned for all but 0, which plans nothing and just shows every beast.
    See src/lib/preset-plans.ts. */
const PRESETS = [0, ...PRESET_THRESHOLDS];

/**
 * Which side of the switch the last visit ended on. Kept in a tiny store
 * rather than in state, so the server can render its own answer ("sell") and
 * the browser can correct it on hydration without a mismatch.
 */
const MODE_KEY = "beast-prices:mode";

const modeStore = {
  listeners: new Set<() => void>(),
  read(): Mode {
    return localStorage.getItem(MODE_KEY) === "trash" ? "trash" : "sell";
  },
  write(next: Mode) {
    localStorage.setItem(MODE_KEY, next);
    for (const listener of modeStore.listeners) listener();
  },
  subscribe(listener: () => void) {
    modeStore.listeners.add(listener);
    return () => {
      modeStore.listeners.delete(listener);
    };
  },
};

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
  // Read against the page background rather than a card, so both halves sit a
  // couple of steps brighter than a warning on white would.
  const sentence = tone === "amber" ? "text-amber-400" : "text-red-400";
  const names = tone === "amber" ? "text-amber-200" : "text-red-200";

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
    <div className="flex gap-2">
      <Input
        readOnly
        value={step.pattern}
        onFocus={(e) => e.currentTarget.select()}
        title={`Search ${index + 1} of ${total}, ${step.covers.length} beasts, ${step.pattern.length}/${MAX_PATTERN_LENGTH} characters`}
        className="h-11 font-mono text-sm"
      />
      <Button variant="secondary" onClick={copy} className="shrink-0">
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

/**
 * A count of beasts, written the way a price is: the figure, then the item it
 * counts. The orb is the one a captured beast ends up in, so it says "beasts"
 * without the word.
 */
function BeastCount({
  value,
  size = 20,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 align-baseline tabular-nums whitespace-nowrap ${className ?? ""}`}
    >
      {num(value)}
      <Image
        src="/Imprinted_Bestiary_Orb_inventory_icon.png"
        alt={value === 1 ? "beast" : "beasts"}
        title="Beasts"
        width={size}
        height={size}
        className="inline-block shrink-0"
      />
    </span>
  );
}

/** Loading shape of one search, so the card does not jump when a plan lands. */
const StepSkeleton = () => (
  <div className="flex gap-2">
    <Skeleton className="h-11 flex-1" />
    <Skeleton className="h-11 w-24 shrink-0" />
  </div>
);

/**
 * Red for the patterns that destroy beasts, green for the one that sells, blue
 * for the bulk pile. The blocks sit straight on the page background now, so the
 * tint carries the whole difference between a block and the page: `frame` is
 * what separates them, `label` names the step and `text` says what it does in
 * the same hue, one step quieter.
 */
const TONES = {
  trash: {
    frame: "border-red-500/70 bg-red-950/40",
    label: "text-red-400",
    text: "text-red-100",
  },
  sell: {
    frame: "border-emerald-500/70 bg-emerald-950/40",
    label: "text-emerald-400",
    text: "text-emerald-100",
  },
  band: {
    frame: "border-sky-500/70 bg-sky-950/40",
    label: "text-sky-400",
    text: "text-sky-100",
  },
} as const;

/** One plan: its searches, and what the plan could not do cleanly. */
function PlanBlock({
  tone,
  step,
  title,
  empty,
  plan,
  handled,
}: {
  tone: keyof typeof TONES;
  /** "Step 2:", when the run has more than one. */
  step?: string;
  title: ReactNode;
  /** What to say when the threshold leaves this half of the split empty. */
  empty: string;
  plan: PatternState;
  /** Extras an earlier step already released, so this one no longer drags them
      in. Naming them again would only contradict the step above. */
  handled?: Set<string>;
}) {
  const { steps, unreachable, pending } = plan;
  const falsePositives = handled
    ? plan.falsePositives.filter((name) => !handled.has(name))
    : plan.falsePositives;
  const { frame, label, text } = TONES[tone];

  // Every beast the searches of this step bring up, the number the step is
  // really about. The searches split it up; how they do that is their business.
  const covered = steps.reduce((sum, s) => sum + s.covers.length, 0);

  return (
    <section className={`space-y-3 rounded-lg border-l-4 p-4 ${frame}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 className="font-medium">
          {step && <span className={label}>{step} </span>}
          <span className={text}>{title}</span>
        </h3>
        {!pending && covered > 0 && (
          <BeastCount value={covered} className={`text-sm ${label}`} />
        )}
      </div>

      {pending ? (
        <StepSkeleton />
      ) : (
        <>
          {steps.map((step, i) => (
            <StepRow
              key={step.pattern}
              index={i}
              total={steps.length}
              step={step}
            />
          ))}

          {steps.length === 0 && (
            <p className="text-sm text-amber-500">{empty}</p>
          )}

          {unreachable.length > 0 && (
            <Notice
              tone="red"
              text={`No search can single out ${unreachable.length} of them, because a beast you are keeping carries the same name as a line of its own. Handle these by hand:`}
            >
              {unreachable}
            </Notice>
          )}

          {falsePositives.length > 0 && (
            <Notice
              tone="amber"
              text={`Also brings up ${falsePositives.length} beast${falsePositives.length === 1 ? "" : "s"} below the threshold, harmless when you are picking what to sell:`}
            >
              {falsePositives}
            </Notice>
          )}
        </>
      )}
    </section>
  );
}

/** A stable empty list, so the hook it is passed to never re-plans. */
const NONE: BeastEntry[] = [];

function BestiaryRegex({
  beasts,
  threshold,
  mode,
  plans,
}: {
  beasts: Beast[];
  threshold: number;
  mode: Mode;
  plans: PresetPlans;
}) {
  // Cheap: the planning itself happens in a worker, see useBestiaryPattern.
  const { sell, trash, band, offBand, banded, sellWanted, sellAvoid } =
    useMemo(() => {
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
      const sell = priced.filter((b) => b.chaosValue! >= threshold).map(entry);
      const trash = priced.filter((b) => b.chaosValue! < threshold).map(entry);
      const band = priced
        .filter((b) => inBand(b.chaosValue!, threshold))
        .map(entry);

      // A pile at exactly the threshold is bulk sold on its own, and then the
      // sell search above it starts one chaos higher. A handful is not worth
      // the extra search and rides along inside it. Same rule on the server,
      // or the plans it precomputed would answer a different question.
      const banded = band.length >= BAND_MIN;
      const inside = new Set(band.map((b) => b.name));

      return {
        sell,
        trash,
        band,
        banded,
        offBand: priced
          .filter((b) => !inBand(b.chaosValue!, threshold))
          .map(entry),
        sellWanted: banded ? sell.filter((b) => !inside.has(b.name)) : sell,
        sellAvoid: banded ? [...trash, ...band] : trash,
      };
    }, [beasts, threshold]);

  const idle = threshold <= 0;

  // Trashing throws beasts away, so it may never show an expensive one — and
  // selling starts with exactly that pattern: clear the cheap ones out first
  // and the sell search then runs over a Bestiary that only holds keepers.
  const trashPlan = useBestiaryPattern(
    idle ? NONE : trash,
    idle ? NONE : sell,
    true,
    idle ? undefined : plans[presetKey(threshold, "trash")],
  );

  // Selling only has to put every valuable beast in front of you; a cheap one
  // in the list costs nothing, and insisting on exactness there would cost
  // searches and leave beasts out. Not planned at all while trashing.
  const selling = !idle && mode === "sell";
  const sellPlan = useBestiaryPattern(
    selling ? sellWanted : NONE,
    selling ? sellAvoid : NONE,
    false,
    selling ? plans[presetKey(threshold, "sell")] : undefined,
  );

  // Step one of a sell run is not "trash everything cheap", it is "trash the
  // few cheap ones this search cannot avoid" — after them the sell search
  // shows keepers and nothing else.
  const dragged = useMemo(() => {
    const names = new Set(sellPlan.falsePositives);
    return trash.filter((b) => names.has(b.name));
  }, [sellPlan.falsePositives, trash]);

  const clearPlan = useBestiaryPattern(
    selling ? dragged : NONE,
    selling ? sell : NONE,
    true,
    selling ? plans[presetKey(threshold, "clear")] : undefined,
  );

  // What step one actually gets rid of. A beast it cannot single out is still
  // in the way afterwards, so the sell search goes on naming that one.
  const released = useMemo(() => {
    if (clearPlan.pending) return undefined;
    const left = new Set(clearPlan.unreachable);
    return new Set(
      dragged.map((b) => b.name).filter((name) => !left.has(name)),
    );
  }, [clearPlan.pending, clearPlan.unreachable, dragged]);

  // Everything worth exactly this much, as its own bulk step. Only sellers
  // care which beasts sit on the threshold itself, and only when there are
  // enough of them to be worth a search.
  const bulk = selling && banded;
  const bandPlan = useBestiaryPattern(
    bulk ? band : NONE,
    bulk ? offBand : NONE,
    true,
    bulk ? plans[presetKey(threshold, "band")] : undefined,
  );

  // Step 3 sweeps the band up whole, so one of its beasts turning up in the
  // step above is not an extra to warn about — and step 1 released the rest.
  const handled = useMemo(() => {
    if (!released || !banded) return released;
    return new Set([...released, ...band.map((b) => b.name)]);
  }, [released, banded, band]);

  const price = <Price value={threshold} size={15} />;

  // One sell run, in the order it is done: clear what is in the way, sell the
  // dear beasts one at a time, bulk sell the pile at the threshold. The first
  // and the last are only there when there is something for them to do, so the
  // numbers are counted rather than written down, and a run of one step does
  // not call itself step 1.
  const hasClear = dragged.length > 0;
  const steps = 1 + (hasClear ? 1 : 0) + (bulk ? 1 : 0);
  /** Where the sell search starts: above the bulk pile, or at the threshold. */
  const floor = <Price value={banded ? threshold + 1 : threshold} size={15} />;

  // Nothing to plan at a threshold of nothing, and the buttons above say so
  // better than a sentence in the empty space would.
  if (idle) return null;

  return (
    <div className="space-y-4">
      {selling ? (
        <>
          {/* No extras, no first step: the sell search is already clean. */}
          {hasClear && (
            <PlanBlock
              tone="trash"
              step="Step 1:"
              title={
                <>
                  release the {dragged.length} cheap beast
                  {dragged.length === 1 ? "" : "s"} in the way
                </>
              }
              empty="These cannot be singled out, so leave them and ignore them below."
              plan={clearPlan}
            />
          )}
          <PlanBlock
            tone="sell"
            step={steps > 1 ? `Step ${hasClear ? 2 : 1}:` : undefined}
            title={
              steps > 1 ? <>sell {floor} and up</> : <>Sell {floor} and up</>
            }
            empty="Nothing to sell at this threshold."
            plan={sellPlan}
            handled={handled}
          />
        </>
      ) : (
        <PlanBlock
          tone="trash"
          title={<>Trash everything under {price}</>}
          empty="Nothing to trash at this threshold."
          plan={trashPlan}
        />
      )}

      {bulk && (
        <PlanBlock
          tone="band"
          step={`Step ${steps}:`}
          title={
            <>
              bulk sell the {band.length} worth exactly {price}
            </>
          }
          empty="No beast is worth exactly this much right now."
          plan={bandPlan}
        />
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
              regex engine: <code>|</code> <code>.</code> <code>^</code>{" "}
              <code>$</code> <code>[^x]</code> <code>(?!…)</code> work,{" "}
              <code>!</code> and quotes do not, a space acts as <code>.</code>.
              It matches <strong>per line</strong>, and a row has more lines
              than the type name: genus, family, the modifiers that capture
              rolled, and its random name. Hence surprise hits: <code>rar</code>{" "}
              sits inside &ldquo;Tempo<em>rar</em>ily Revives&rdquo;, which any
              beast can roll.
            </p>
            <p>
              <span className="font-medium">So a fragment is refused</span> if
              it could land in a modifier name or in any of the 35,237 generated
              names, and an unanchored one needs six characters.{" "}
              <code>^goatman$</code> pins a whole line, the only way to separate
              &ldquo;Goatman&rdquo; from &ldquo;Goatman Fire-raiser&rdquo;. Past
              249 characters you get a second search, never a truncated one.
            </p>
            <p>
              <span className="font-medium">Trash and Sell are opposites.</span>{" "}
              Trash is destructive, so no search may ever show a beast above the
              threshold. Sell only needs every valuable beast on screen, so a
              cheap one riding along is fine. Sell mode hands you both, in the
              order they are run: the <span className="text-red-400">red</span>{" "}
              search clears the cheap ones out at the altar, then the{" "}
              <span className="text-emerald-400">green</span> one picks up what
              is left. When a pile of beasts sits on the threshold itself, a{" "}
              <span className="text-sky-400">blue</span> one takes that pile
              last, in bulk, at one price. Negation would fix trashing in one
              line, but a row returns as soon as any other line matches.
            </p>
            <p>
              <span className="font-medium">Bestiary Sim</span> tries a pattern
              against every listed beast, rolled and priced, so an expensive
              beast in a trash pattern shows up before it is gone.
            </p>
            <p className="text-muted-foreground">
              {beasts.length} beasts, {fromNinja} from poe.ninja. No listing
              anywhere means the beast is gone, not cheap, so those are left
              out.
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
  plans,
}: {
  beasts: Beast[];
  /** poe.ninja detail pages live under the league, so links need it. */
  league: string;
  /** Planned on the server for the preset thresholds, so they need no wait. */
  plans: PresetPlans;
}) {
  const [query, setQuery] = useState("");
  const [minChaos, setMinChaos] = useState("");
  /** What the free field shows. A preset click empties it, so it never mirrors
      the buttons and always reads as somewhere to type. */
  const [typed, setTyped] = useState("");
  const [sort, setSort] = useState<SortKey>("chaosValue");
  const [desc, setDesc] = useState(true);
  const [showNotFound, setShowNotFound] = useState(false);
  const mode = useSyncExternalStore(
    modeStore.subscribe,
    modeStore.read,
    () => "sell" as Mode,
  );

  const threshold = Number(minChaos) || 0;
  /** A value the preset buttons do not cover, so the free field owns it. */
  const custom = threshold > 0 && !PRESETS.includes(threshold);

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
    // Password managers stamp their own attribute on the nearest thing that
    // looks like a form to them, which here is this div, and they do it before
    // React hydrates. The extra attribute is theirs to keep, so this element is
    // exempt from the attribute check that would otherwise report it.
    <div className="space-y-5" suppressHydrationWarning>
      <div className="flex flex-wrap items-center gap-3">
        <div className="bg-secondary/60 flex rounded-full p-1">
          {(["sell", "trash"] as Mode[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => modeStore.write(option)}
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

          {/* The thresholds worth farming at, plus anything else, in one
              control — the free field is the last segment of the same pill. */}
          <div className="bg-secondary/60 flex items-center rounded-full p-1">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setMinChaos(String(preset));
                  setTyped("");
                }}
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

            <span className="bg-border mx-1 h-5 w-px shrink-0" />

            <input
              id="min-chaos"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setMinChaos(e.target.value);
              }}
              placeholder="Other"
              aria-label="Any other minimum"
              // No spinner: the arrows are useless at these ranges and steal room.
              className={`placeholder:text-muted-foreground/70 w-[4.5rem] rounded-full border py-1.5 text-center text-sm tabular-nums transition-colors outline-none [appearance:textfield] focus:border-transparent [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                custom
                  ? "bg-background text-foreground border-transparent shadow-sm"
                  : "text-foreground border-border/80 hover:border-foreground/40 focus:bg-background border-dashed bg-transparent focus:shadow-sm"
              }`}
            />
          </div>
        </div>

        {/* The help belongs with the controls it explains, at the far end of
            their row rather than over the steps. */}
        <div className="ml-auto">
          <HelpTip beasts={found} />
        </div>
      </div>

      <BestiaryRegex
        beasts={found}
        threshold={threshold}
        mode={mode}
        plans={plans}
      />

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
          {num(rows.length)} of <BeastCount value={listed.length} size={22} />
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((col) => {
                const active = sort === col.key;
                const Icon = !active
                  ? ChevronsUpDown
                  : desc
                    ? ArrowDown
                    : ArrowUp;
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
                        alt={
                          beast.rarity === "red" ? "Red beast" : "Yellow beast"
                        }
                        title={
                          beast.rarity === "red"
                            ? "Red beast, two mods, cannot spawn normally"
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
                      <span className="tabular-nums">–</span>
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
