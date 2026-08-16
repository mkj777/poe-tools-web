"use client";

import { useEffect, useRef, useState } from "react";
import type { BeastEntry } from "./bestiary-regex";
import type { SolveRequest, SolveResponse } from "./bestiary.worker";

export type PatternState = SolveResponse & { pending: boolean };

const IDLE: PatternState = {
  id: 0,
  pattern: null,
  overmatched: [],
  missing: [],
  pending: true,
};

/**
 * Builds the search pattern in a worker, keeping the threshold field
 * responsive. Only the newest request counts — earlier answers are dropped, so
 * holding a key down does not paint stale patterns on the way through.
 */
export function useBestiaryPattern(wanted: BeastEntry[], unwanted: BeastEntry[]) {
  const worker = useRef<Worker | null>(null);
  const latest = useRef(0);
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
    if (!worker.current) return;
    const id = ++latest.current;
    setState((previous) => ({ ...previous, pending: true }));
    worker.current.postMessage({ id, wanted, unwanted } satisfies SolveRequest);
  }, [wanted, unwanted]);

  return state;
}
