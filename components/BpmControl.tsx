"use client";

/**
 * BPM control — editable numeric readout flanked by −10 / +10 steppers, plus a
 * fine slider. All paths apply live mid-playback via the engine, no restart.
 */
import { useState } from "react";
import { usePlayback, BPM_MIN, BPM_MAX } from "@/lib/store/playback";

export function BpmControl() {
  const bpm = usePlayback((s) => s.bpm);
  const setBpm = usePlayback((s) => s.setBpm);

  // Local draft while the user is typing; committed (clamped) on blur/Enter.
  const [draft, setDraft] = useState<string | null>(null);

  // The store→engine subscription (in Metronome) pushes the new tempo live.
  function commit(value: number) {
    setBpm(value); // store clamps
  }

  function step(delta: number) {
    commit(bpm + delta);
  }

  function commitDraft() {
    if (draft !== null) {
      const parsed = parseInt(draft, 10);
      if (!Number.isNaN(parsed)) commit(parsed);
      setDraft(null);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-4">
        <Stepper label="Decrease tempo by 10" onClick={() => step(-10)}>
          −
        </Stepper>

        <div className="flex items-baseline gap-2 font-mono">
          <input
            type="text"
            inputMode="numeric"
            aria-label="Tempo in beats per minute"
            value={draft ?? String(bpm)}
            onFocus={(e) => {
              setDraft(String(bpm));
              e.currentTarget.select();
            }}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setDraft(null);
                e.currentTarget.blur();
              }
            }}
            className="w-28 bg-transparent text-center text-5xl font-light tabular-nums
                       outline-none focus:text-foreground
                       selection:bg-foreground/20"
          />
          <span className="text-sm text-foreground/50">BPM</span>
        </div>

        <Stepper label="Increase tempo by 10" onClick={() => step(10)}>
          +
        </Stepper>
      </div>

      <div className="flex w-72 flex-col items-center gap-2">
        <input
          type="range"
          min={BPM_MIN}
          max={BPM_MAX}
          value={bpm}
          onChange={(e) => commit(Number(e.target.value))}
          aria-label="Tempo slider"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-foreground/15
                     accent-foreground"
        />
        <div className="flex w-full justify-between font-mono text-xs text-foreground/40">
          <span>{BPM_MIN}</span>
          <span>{BPM_MAX}</span>
        </div>
      </div>
    </div>
  );
}

function Stepper({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full border border-foreground/15
                 text-xl leading-none text-foreground/70 transition-colors
                 hover:bg-foreground/[0.04] hover:text-foreground
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
    >
      {children}
    </button>
  );
}
