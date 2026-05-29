"use client";

/**
 * Interactive beat row (SPEC Step 3). One cell per beat, doing double duty:
 *  - indicator: the currently-playing beat highlights as the transport advances.
 *  - stress editor: click a cell to toggle its accent on/off.
 */
import { usePlayback } from "@/lib/store/playback";

export function BeatRow() {
  const beatsPerBar = usePlayback((s) => s.beatsPerBar);
  const accents = usePlayback((s) => s.accents);
  const currentBeat = usePlayback((s) => s.currentBeat);
  const playing = usePlayback((s) => s.playing);
  const toggleAccent = usePlayback((s) => s.toggleAccent);

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: beatsPerBar }).map((_, i) => {
        const stressed = accents[i];
        const active = playing && i === currentBeat;
        return (
          <button
            key={i}
            type="button"
            aria-label={`Beat ${i + 1}${stressed ? ", accented" : ""}`}
            aria-pressed={stressed}
            onClick={() => toggleAccent(i)}
            className={`h-10 w-10 rounded-md border text-xs font-mono transition-all duration-75
              ${stressed
                ? "border-transparent bg-[#ff5a3c] text-white"
                : "border-foreground/15 bg-foreground/[0.03] text-foreground/40 hover:bg-foreground/[0.06]"}
              ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105" : ""}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
