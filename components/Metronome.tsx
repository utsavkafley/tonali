"use client";

/**
 * The metronome — full view of the Timing layer (SPEC Steps 1+3+5). Purely presentational:
 * the audio lifecycle (subscription + teardown) lives in PracticeSurface so the metronome
 * keeps running even when this view is docked/unmounted. Start/stop goes through the
 * shared `toggleMetronome` controller.
 */
import { toggleMetronome } from "@/lib/audio/metronomeController";
import { usePlayback } from "@/lib/store/playback";
import { BpmControl } from "@/components/BpmControl";
import { BeatRow } from "@/components/BeatRow";
import { MeterControls } from "@/components/MeterControls";

export function Metronome() {
  const playing = usePlayback((s) => s.playing);
  const audioReady = usePlayback((s) => s.audioReady);
  const currentBeat = usePlayback((s) => s.currentBeat);
  const accent = currentBeat >= 0 && usePlayback.getState().accents[currentBeat];

  return (
    <div className="flex flex-col items-center gap-8">
      <button
        onClick={toggleMetronome}
        aria-label={playing ? "Stop metronome" : "Start metronome"}
        className="group relative grid h-56 w-56 place-items-center rounded-full
                   border border-foreground/15 bg-foreground/[0.02]
                   transition-colors hover:bg-foreground/[0.04]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      >
        <span
          key={currentBeat}
          className={`pointer-events-none absolute inset-0 rounded-full ${
            playing ? "animate-[ping_0.6s_ease-out_1]" : ""
          } ${accent ? "bg-[#ff5a3c]/15" : "bg-foreground/[0.04]"}`}
        />
        <span className="z-10 select-none text-lg font-medium tracking-wide">
          {playing ? "Stop" : audioReady ? "Start" : "Tap to start"}
        </span>
      </button>

      <BeatRow />
      <BpmControl />
      <MeterControls />
    </div>
  );
}
