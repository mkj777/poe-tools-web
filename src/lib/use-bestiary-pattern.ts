"use client";

import { useEffect, useRef, useState } from "react";
import type { BeastEntry, BestiaryPlan } from "./bestiary-regex";
import type { SolveRequest, SolveResponse } from "./bestiary.worker";

export type PatternState = SolveResponse & { pending: boolean };

const IDLE: PatternState = {
  id: 0,
  steps: [],
  unreachable: [],
  falsePositives: [],
  pending: true,
};

/** What a plan depends on, short enough to use as a cache key. */
const signature = (wanted: BeastEntry[], unwanted: BeastEntry[], exact: boolean) =>
  `${exact ? "x" : "o"}|${wanted.length}:${unwanted.length}|${wanted
    .map((b) => b.name)
    .join(",")}`;

/**
 * Plans the searches in a worker, keeping the threshold field responsive. Only
 * the newest request counts — earlier answers are dropped, so holding a key
 * down does not paint stale patterns on the way through.
 *
 * Two things keep it off the worker where possible. `ready` carries the plans
 * the server precomputed for the preset thresholds, which are the ones most
 * people ever use, and everything the worker does answer is remembered for the
 * rest of the session — so going back to a threshold is instant even when it
 * was not a preset.
 */
export function useBestiaryPattern(
  wanted: BeastEntry[],
  unwanted: BeastEntry[],
  exact: boolean,
  ready?: BestiaryPlan,
) {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
  const seen = useRef(new Map<string, BestiaryPlan>());
  const [state, setState] = useState<PatternState>(IDLE);

  useEffect(() => {
    const instance = new Worker(
      new URL("./bestiary.worker.ts", import.meta.url),
      { type: "module" },
    );
    instance.onmessage = ({ data }: MessageEvent<SolveResponse>) => {
      if (data.id !== latest.current) return;
      setState({ ...data, pending: false });
    };
    worker.current = instance;
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    const key = signature(wanted, unwanted, exact);
    const known = ready ?? seen.current.get(key);
    if (known) {
      setState({ id: latest.current, ...known, pending: false });
      return;
    }

    if (!worker.current) return;
    const id = ++latest.current;
    setState((previous) => ({ ...previous, pending: true }));
    worker.current.postMessage({
      id,
      wanted,
      unwanted,
      exact,
    } satisfies SolveRequest);
  }, [wanted, unwanted, exact, ready]);

  // Remember whatever the worker did answer, keyed the same way.
  useEffect(() => {
    if (state.pending) return;
    seen.current.set(signature(wanted, unwanted, exact), {
      steps: state.steps,
      unreachable: state.unreachable,
      falsePositives: state.falsePositives,
    });
  }, [state, wanted, unwanted, exact]);

  return state;
}
