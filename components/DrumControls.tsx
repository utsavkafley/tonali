"use client";

/**
 * Drum controls — enable toggle, genre/pattern picker, per-instrument mutes,
 * and master volume. Compact: sits below the metronome in the Timing layer.
 */
import { useEffect } from "react";
import { useDrums } from "@/lib/store/drums";
import { DRUM_PATTERNS, DRUM_INSTRUMENTS, INSTRUMENT_LABELS } from "@/lib/theory/drumPatterns";
import { setDrumVolume } from "@/lib/audio/drums";

export function DrumControls() {
  const { enabled, pattern, mutes, volumeDb, setEnabled, setPatternById, toggleMute, setVolumeDb } =
    useDrums();

  // Keep audio engine volume in sync with store
  useEffect(() => {
    setDrumVolume(enabled ? volumeDb : -Infinity);
  }, [volumeDb, enabled]);

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border px-6 py-4 transition-colors
        ${enabled ? "border-foreground/20 bg-foreground/[0.02]" : "border-foreground/10 bg-transparent"}`}
    >
      {/* Header row: label + toggle */}
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-wider text-foreground/50">Drums</span>
        <button
          onClick={() => setEnabled(!enabled)}
          aria-pressed={enabled}
          className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              enabled
                ? "border-[#ff5a3c] bg-[#ff5a3c]/10 text-[#ff5a3c]"
                : "border-foreground/20 text-foreground/60 hover:bg-foreground/[0.04]"
            }`}
        >
          {enabled ? "On" : "Off"}
        </button>
      </div>

      {enabled && (
        <>
          {/* Pattern picker */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {DRUM_PATTERNS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPatternById(p.id)}
                aria-pressed={pattern.id === p.id}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                    pattern.id === p.id
                      ? "border-[#ff5a3c] bg-[#ff5a3c]/10 text-foreground"
                      : "border-foreground/15 text-foreground/60 hover:bg-foreground/[0.04]"
                  }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Per-instrument mute toggles */}
          <div className="flex items-center gap-2">
            {DRUM_INSTRUMENTS.map((inst) => (
              <button
                key={inst}
                onClick={() => toggleMute(inst)}
                aria-pressed={!mutes[inst]}
                title={mutes[inst] ? `Unmute ${INSTRUMENT_LABELS[inst]}` : `Mute ${INSTRUMENT_LABELS[inst]}`}
                className={`rounded border px-2.5 py-1 text-xs font-mono transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                    mutes[inst]
                      ? "border-foreground/10 text-foreground/25 line-through"
                      : "border-foreground/20 text-foreground/70 hover:bg-foreground/[0.04]"
                  }`}
              >
                {INSTRUMENT_LABELS[inst]}
              </button>
            ))}
          </div>

          {/* Master volume */}
          <div className="flex w-full max-w-xs items-center gap-3">
            <span className="w-8 text-right font-mono text-xs text-foreground/40">🔉</span>
            <input
              type="range"
              min={-40}
              max={0}
              step={1}
              value={volumeDb}
              onChange={(e) => setVolumeDb(Number(e.target.value))}
              aria-label="Drum volume"
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-foreground/15 accent-[#ff5a3c]"
            />
            <span className="w-8 font-mono text-xs text-foreground/40">🔊</span>
          </div>
        </>
      )}
    </div>
  );
}
