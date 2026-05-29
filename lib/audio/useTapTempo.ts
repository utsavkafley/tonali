"use client";

/**
 * Tap-tempo hook (SPEC Step 2). Returns a `tap()` to call on each pad hit.
 *
 * BPM = 60000 / (rolling average of the last few inter-tap intervals), with outlier
 * rejection so one sloppy tap doesn't yank the tempo. A long gap resets to a fresh
 * measurement. Sets BPM live (store + engine); never touches playback.
 */
import { useCallback, useRef } from "react";
import { setBpm as setEngineBpm } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/store/playback";

/** A tap further apart than this starts a fresh measurement. */
const TAP_GAP_MS = 2000;
/** Faster than 240 BPM → accidental double-fire, ignored. */
const MIN_TAP_INTERVAL_MS = 250;
/** Timestamps kept for the rolling average (→ up to N-1 intervals). */
const TAP_WINDOW = 5;
/** Intervals beyond this ratio of the running median are discarded as misfires. */
const OUTLIER_RATIO = 1.8;

export function useTapTempo() {
  const tapsRef = useRef<number[]>([]);
  const lastRef = useRef(0);

  return useCallback(() => {
    const now = performance.now();
    const delta = now - lastRef.current;

    // Debounce implausibly fast double-fires (but never the very first tap).
    if (lastRef.current !== 0 && delta < MIN_TAP_INTERVAL_MS) return;

    // A long gap (or first ever tap) starts a fresh measurement.
    if (delta > TAP_GAP_MS) {
      tapsRef.current = [now];
      lastRef.current = now;
      return;
    }

    lastRef.current = now;
    const times = [...tapsRef.current, now].slice(-TAP_WINDOW);
    tapsRef.current = times;
    if (times.length < 2) return;

    let intervals = times.slice(1).map((t, i) => t - times[i]);

    // Reject outliers relative to the median interval.
    const sorted = [...intervals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    intervals = intervals.filter(
      (iv) => iv <= median * OUTLIER_RATIO && iv >= median / OUTLIER_RATIO,
    );
    if (intervals.length === 0) return;

    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const bpm = Math.round(60000 / avg);

    usePlayback.getState().setBpm(bpm); // store clamps to range
    setEngineBpm(usePlayback.getState().bpm); // apply clamped value live
  }, []);
}
