"use client";

/**
 * 2×2 tap pads (SPEC Step 2). Dual-purpose by design:
 *  - now: any pad taps feed the shared tap-tempo detector.
 *  - later: each pad gets a `voice` (a drum sampler) and also makes sound on hit —
 *    an upgrade, not a rewrite. The `voice` slot is stubbed here for that future.
 */
import { useState } from "react";
import { ensureAudioStarted } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/store/playback";
import { useTapTempo } from "@/lib/audio/useTapTempo";

export function PadGrid({ className = "" }: { className?: string }) {
  const tap = useTapTempo();

  function handleHit() {
    // A pad press is a valid gesture to unlock audio (forward-compat with drums).
    void ensureAudioStarted().then(() => usePlayback.getState().setAudioReady(true));
    tap(); // uses performance.now() internally — must run synchronously.
  }

  return (
    <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Pad key={i} onHit={handleHit} />
      ))}
    </div>
  );
}

/** A single pad. `voice` is reserved for the future drum-sample trigger. */
function Pad({ onHit }: { onHit: () => void; voice?: never }) {
  const [hit, setHit] = useState(false);

  return (
    <button
      type="button"
      aria-label="Tap tempo pad"
      onPointerDown={(e) => {
        e.preventDefault(); // avoid double-fire / text selection on tap
        onHit();
        setHit(true);
        window.setTimeout(() => setHit(false), 110);
      }}
      className={`h-11 w-11 rounded-md border border-foreground/15 transition-all duration-100
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                    hit
                      ? "scale-95 bg-foreground/30"
                      : "bg-foreground/[0.03] hover:bg-foreground/[0.06]"
                  }`}
    />
  );
}
