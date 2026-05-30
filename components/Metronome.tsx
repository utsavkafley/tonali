"use client";

/**
 * The metronome — the visual centerpiece (SPEC Step 1 + Step 3).
 *
 * The big circle owns start/stop ONLY (tap tempo lives in the pads, Step 2). The
 * first tap also unlocks audio (SPEC §A). This component is the audio orchestration
 * layer — it wires the engine + metronome modules to the store, and reschedules the
 * click grid when the subdivision changes (Step 3).
 */
import { useEffect } from "react";
import {
  ensureAudioStarted,
  configureTransport,
  startTransport,
  stopTransport,
  setBpm as setEngineBpm,
  setSwing as setEngineSwing,
} from "@/lib/audio/engine";
import {
  startMetronome,
  stopMetronome,
  disposeMetronome,
  type MetronomeConfig,
} from "@/lib/audio/metronome";
import { usePlayback } from "@/lib/store/playback";
import { BpmControl } from "@/components/BpmControl";
import { BeatRow } from "@/components/BeatRow";
import { MeterControls } from "@/components/MeterControls";

// Stable getters that read live state — no props/hooks, so they live at module scope.
const getConfig = (): MetronomeConfig => {
  const s = usePlayback.getState();
  return {
    beatsPerBar: s.beatsPerBar,
    accents: s.accents,
    mutes: s.mutes,
    subdivision: s.subdivision,
  };
};
const onBeat = (beat: number) => usePlayback.getState().setCurrentBeat(beat);

export function Metronome() {
  const playing = usePlayback((s) => s.playing);
  const audioReady = usePlayback((s) => s.audioReady);
  const currentBeat = usePlayback((s) => s.currentBeat);

  // Clean teardown on unmount: no ghost schedules or leaked nodes (SPEC §B).
  // Subdivision/meter/stress/mutes all apply live via getConfig — no reschedule needed.
  useEffect(() => {
    return () => {
      stopTransport();
      disposeMetronome();
    };
  }, []);

  // Single source of truth → engine: push tempo & swing whenever they change (covers
  // manual edits, tap tempo, and practice presets alike).
  useEffect(() => {
    return usePlayback.subscribe((s, prev) => {
      if (s.bpm !== prev.bpm) setEngineBpm(s.bpm);
      if (s.swing !== prev.swing) setEngineSwing(s.swing);
    });
  }, []);

  async function toggle() {
    await ensureAudioStarted();
    const s = usePlayback.getState();
    s.setAudioReady(true);

    if (s.playing) {
      stopTransport();
      stopMetronome();
      s.setPlaying(false);
      s.setCurrentBeat(-1);
      return;
    }

    configureTransport({ bpm: s.bpm, timeSignature: [s.beatsPerBar, 4], swing: s.swing });
    startMetronome(getConfig, onBeat);
    startTransport();
    s.setPlaying(true);
  }

  const accent = currentBeat >= 0 && usePlayback.getState().accents[currentBeat];

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Big clickable metronome — start / stop */}
      <button
        onClick={toggle}
        aria-label={playing ? "Stop metronome" : "Start metronome"}
        className="group relative grid h-56 w-56 place-items-center rounded-full
                   border border-foreground/15 bg-foreground/[0.02]
                   transition-colors hover:bg-foreground/[0.04]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      >
        {/* Pulse ring — keyed on beat so it re-triggers every tick, in audio sync */}
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

      {/* Interactive beat row: indicator + stress editor */}
      <BeatRow />

      <BpmControl />

      <MeterControls />
    </div>
  );
}
