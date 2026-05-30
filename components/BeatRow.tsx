"use client";

/**
 * Interactive beat row (SPEC Step 3 + muted beats). One cell per beat, doing double duty:
 *  - indicator: the currently-playing beat highlights as the transport advances.
 *  - editor: click a cell to cycle normal → stressed → muted → normal.
 *
 * Muted beats are silent (gap-click): you still see the indicator pass over them, but
 * hear nothing — the drill that tests whether YOU keep time.
 */
import { usePlayback } from "@/lib/store/playback";

export function BeatRow() {
  const beatsPerBar = usePlayback((s) => s.beatsPerBar);
  const accents = usePlayback((s) => s.accents);
  const mutes = usePlayback((s) => s.mutes);
  const currentBeat = usePlayback((s) => s.currentBeat);
  const playing = usePlayback((s) => s.playing);
  const cycleBeat = usePlayback((s) => s.cycleBeat);

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: beatsPerBar }).map((_, i) => {
        const stressed = accents[i];
        const muted = mutes[i];
        const active = playing && i === currentBeat;
        const state = muted ? "muted" : stressed ? "stressed" : "normal";

        return (
          <button
            key={i}
            type="button"
            aria-label={`Beat ${i + 1}, ${state}`}
            onClick={() => cycleBeat(i)}
            className={`h-10 w-10 rounded-md border font-mono text-xs transition-all duration-75
              ${
                muted
                  ? "border-dashed border-foreground/20 bg-transparent text-foreground/25 line-through"
                  : stressed
                    ? "border-transparent bg-[#ff5a3c] text-white"
                    : "border-foreground/15 bg-foreground/[0.03] text-foreground/40 hover:bg-foreground/[0.06]"
              }
              ${active ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-105" : ""}`}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}
