"use client";

import { useEffect, useRef, useState } from "react";
import type { BeastEntry, BestiaryPlan } from "./bestiary-regex";
import type { SolveRequest, SolveResponse } from "./bestiary.worker";

export type PatternState = BestiaryPlan & { pending: boolean };

const IDLE: PatternState = {
  steps: [],
  unreachable: [],
  falsePositives: [],
  pending: true,
};

/** Which inputs the state in hand belongs to, so the plan for the threshold
    left behind is never shown as the answer to the current one. */
type Held = PatternState & { key: string };

/** What a plan depends on, short enough to use as a cache key. */
const signature = (wanted: BeastEntry[], unwanted: BeastEntry[], exact: boolean) =>
  `${exact ? "x" : "o"}|${wanted.length}:${unwanted.length}|${wanted
    .map((b) => b.name)
    .join(",")}`;

/**
 * Every plan the worker has answered this session, keyed the same way. It
 * outlives the components that asked for it on purpose: switching mode or
 * league mounts new ones, and the answers are just as good there.
 */
const remembered = new Map<string, BestiaryPlan>();

/**
 * Plans the searches in a worker, keeping the threshold field responsive. Only
 * the newest request counts — earlier answers are dropped, so holding a key
 * down does not paint stale patterns on the way through.
 *
 * Two things keep it off the worker where possible. `ready` carries the plans
 * the server precomputed for the preset thresholds, which are the ones most
 * people ever use, and everything the worker does answer is remembered for the
 * rest of the session — so going back to a threshold is instant even when it
 * was not a preset. Both are read while rendering rather than from an effect,
 * so a plan already in hand paints in the same frame as the click.
 */
export function useBestiaryPattern(
  wanted: BeastEntry[],
  unwanted: BeastEntry[],
  exact: boolean,
  ready?: BestiaryPlan,
) {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const [state, setState] = useState<Held>({ ...IDLE, key: "" });

  const key = signature(wanted, unwanted, exact);
  const known = ready ?? remembered.get(key);
  /** What the outstanding request asked for; the answer carries only its id. */
  const pending = useRef(key);

  useEffect(() => {
    const instance = new Worker(
      new URL("./bestiary.worker.ts", import.meta.url),
      { type: "module" },
    );
    instance.onmessage = ({ data }: MessageEvent<SolveResponse>) => {
      if (data.id !== latest.current) return;
      const plan = {
        steps: data.steps,
        unreachable: data.unreachable,
        falsePositives: data.falsePositives,
      };
      // The id is only ever the newest request's, so this is that request's key.
      remembered.set(pending.current, plan);
      setState({ ...plan, pending: false, key: pending.current });
    };
    worker.current = instance;
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    if (known || !worker.current) return;
    pending.current = key;
    worker.current.postMessage({
      id: ++latest.current,
      wanted,
      unwanted,
      exact,
    } satisfies SolveRequest);
  }, [wanted, unwanted, exact, key, known]);

  if (known) return { ...known, pending: false };
  return state.key === key ? state : IDLE;
}
