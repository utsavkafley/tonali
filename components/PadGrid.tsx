"use client";

/**
 * 2×2 tap pads (SPEC Step 2 + Drums). Dual-purpose by design:
 *
 * DEFAULT MODE — drum triggers: each pad plays its assigned drum instrument.
 * TAP BPM MODE — any pad feeds the tap-tempo detector; auto-reverts to drum mode
 *   after the >2s gap (the same boundary useTapTempo already uses).
 *
 * A small "Tap BPM" toggle near the pads arms the mode. While active the pads are
 * visually highlighted and hits set BPM instead of making drum sounds.
 */
import { useState, useRef } from "react";
import { ensureAudioStarted } from "@/lib/audio/engine";
import { triggerDrum } from "@/lib/audio/drums";
import { useTapTempo } from "@/lib/audio/useTapTempo";
import { usePlayback } from "@/lib/store/playback";
import { useDrums } from "@/lib/store/drums";
import { DRUM_INSTRUMENTS, type DrumInstrument } from "@/lib/theory/drumPatterns";

const PAD_VOICES: DrumInstrument[] = ["kick", "snare", "hihatClosed", "hihatOpen"];

const TAP_REVERT_MS = 2000; // matches useTapTempo's gap threshold

export function PadGrid({ className = "" }: { className?: string }) {
  const [tapMode, setTapMode] = useState(false);
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tap = useTapTempo();
  const drumsEnabled = useDrums((s) => s.enabled);

  function armTapMode() {
    setTapMode(true);
    scheduleRevert();
  }

  function scheduleRevert() {
    if (revertTimer.current) clearTimeout(revertTimer.current);
    revertTimer.current = setTimeout(() => {
      setTapMode(false);
      revertTimer.current = null;
    }, TAP_REVERT_MS);
  }

  async function handleHit(padIndex: number) {
    await ensureAudioStarted();
    usePlayback.getState().setAudioReady(true);

    if (tapMode) {
      tap();
      scheduleRevert(); // reset the auto-revert timer on each tap
    } else {
      triggerDrum(PAD_VOICES[padIndex]);
    }
  }

  return (
    <div className={`flex flex-col items-end gap-1.5 ${className}`}>
      {/* Tap BPM toggle */}
      <button
        onClick={armTapMode}
        aria-pressed={tapMode}
        title="Tap BPM (auto-reverts)"
        className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors
          focus:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 ${
            tapMode
              ? "bg-[#ff5a3c]/15 text-[#ff5a3c]"
              : "text-foreground/35 hover:text-foreground/60"
          }`}
      >
        TAP BPM
      </button>

      {/* 2×2 pad grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pad
            key={i}
            onHit={() => handleHit(i)}
            label={tapMode ? "♩" : DRUM_INSTRUMENTS[i]?.slice(0, 2).toUpperCase()}
            tapMode={tapMode}
            dimmed={!tapMode && !drumsEnabled}
          />
        ))}
      </div>
    </div>
  );
}

function Pad({
  onHit,
  label,
  tapMode,
  dimmed,
}: {
  onHit: () => void;
  label?: string;
  tapMode: boolean;
  dimmed: boolean;
}) {
  const [hit, setHit] = useState(false);

  return (
    <button
      type="button"
      aria-label="Drum pad"
      onPointerDown={(e) => {
        e.preventDefault();
        onHit();
        setHit(true);
        window.setTimeout(() => setHit(false), 110);
      }}
      className={`h-11 w-11 rounded-md border text-[9px] font-mono font-bold uppercase
                  transition-all duration-100 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                    hit
                      ? tapMode
                        ? "scale-95 border-[#ff5a3c]/60 bg-[#ff5a3c]/20"
                        : "scale-95 bg-foreground/30 border-foreground/30"
                      : tapMode
                        ? "border-[#ff5a3c]/30 bg-[#ff5a3c]/5 text-[#ff5a3c]/60"
                        : dimmed
                          ? "border-foreground/10 bg-foreground/[0.02] text-foreground/20"
                          : "border-foreground/15 bg-foreground/[0.03] text-foreground/40 hover:bg-foreground/[0.06]"
                  }`}
    >
      {label}
    </button>
  );
}
