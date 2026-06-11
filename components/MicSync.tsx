"use client";

/**
 * Mic sync button (fretboard view). Listens to the room audio, detects BPM from the
 * low-frequency kick-drum band, and auto-launches the progression aligned to the next
 * predicted beat. Shows live beat flashes and BPM while listening.
 */
import { useEffect, useRef, useState } from "react";
import { startMicSync, type MicSyncHandle } from "@/lib/audio/micSync";
import { startProgressionClock, stopProgressionClock } from "@/lib/audio/progressionClock";
import { ensureAudioStarted } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/store/playback";
import { useHarmony } from "@/lib/store/harmony";

type State = "idle" | "listening" | "locked";

export function MicSync() {
  const [state, setState] = useState<State>("idle");
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const handleRef = useRef<MicSyncHandle | null>(null);

  const hasProg = useHarmony((s) => s.chartData !== null);

  // Pulse the flash indicator on each detected beat
  useEffect(() => {
    if (flash) {
      const t = setTimeout(() => setFlash(false), 80);
      return () => clearTimeout(t);
    }
  }, [flash]);

  // Clean up if component unmounts while listening
  useEffect(() => () => handleRef.current?.stop(), []);

  async function toggle() {
    if (state !== "idle") {
      handleRef.current?.stop();
      handleRef.current = null;
      setState("idle");
      setLiveBpm(null);
      return;
    }

    try {
      await ensureAudioStarted();
      usePlayback.getState().setAudioReady(true);
      setState("listening");

      const handle = await startMicSync({
        onBeat: () => setFlash(true),
        onBpmUpdate: (bpm) => setLiveBpm(bpm),
        onStable: async (bpm, delayMs) => {
          setState("locked");

          // Update the global BPM to match the detected tempo
          usePlayback.getState().setBpm(bpm);

          // Launch the progression, timed to the next predicted beat
          stopProgressionClock();
          await startProgressionClock(delayMs);
          useHarmony.getState().setProgressionPlaying(true);

          // Stop listening — we have what we need
          handle.stop();
          handleRef.current = null;
        },
      });

      handleRef.current = handle;
    } catch (err) {
      console.warn("Mic sync failed:", err);
      setState("idle");
      setLiveBpm(null);
    }
  }

  if (!hasProg) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Beat flash dot */}
      {state === "listening" && (
        <span
          className={`h-2.5 w-2.5 rounded-full transition-colors duration-75 ${
            flash ? "bg-[#ff5a3c]" : "bg-foreground/20"
          }`}
        />
      )}

      {/* Live BPM readout */}
      {state === "listening" && liveBpm && (
        <span className="font-mono text-sm tabular-nums text-foreground/60">
          {liveBpm} BPM
        </span>
      )}

      {/* Main button */}
      <button
        onClick={toggle}
        className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
            state === "locked"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              : state === "listening"
                ? "border-[#ff5a3c]/40 bg-[#ff5a3c]/10 text-[#ff5a3c] hover:bg-[#ff5a3c]/20"
                : "border-foreground/20 text-foreground/70 hover:bg-foreground/[0.05]"
          }`}
      >
        {state === "locked"
          ? "✓ Synced"
          : state === "listening"
            ? "Listening… (tap to cancel)"
            : "🎤 Sync to track"}
      </button>

      {state === "listening" && !liveBpm && (
        <span className="text-xs text-foreground/40">detecting beat…</span>
      )}
      {state === "listening" && liveBpm && (
        <span className="text-xs text-foreground/40">hold steady…</span>
      )}
    </div>
  );
}
