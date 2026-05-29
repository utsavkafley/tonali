"use client";

/**
 * The metronome — the visual centerpiece (SPEC Step 1).
 *
 * The big circle is the unlock gesture AND the tap interface:
 *  - an isolated tap (>GAP since the last) is a control tap: start / stop.
 *  - taps in quick succession (≤GAP) are tempo taps: they set the BPM from the
 *    rolling average inter-tap interval, and start playback if stopped.
 * The rhythm of the taps disambiguates intent — no separate mode or button.
 */
import { useEffect, useRef } from "react";
import {
  ensureAudioStarted,
  configureTransport,
  setBpm as setEngineBpm,
  startTransport,
  stopTransport,
  getTransport,
} from "@/lib/audio/engine";
import {
  startMetronome,
  stopMetronome,
  disposeMetronome,
} from "@/lib/audio/metronome";
import { usePlayback } from "@/lib/store/playback";
import { BpmControl } from "@/components/BpmControl";

/** A tap further apart than this counts as a start/stop, not a tempo tap. */
const TAP_GAP_MS = 2000;
/** Faster than 240 BPM → treat as an accidental double-fire and ignore. */
const MIN_TAP_INTERVAL_MS = 250;
/** How many recent taps feed the rolling BPM average. */
const TAP_WINDOW = 5;

export function Metronome() {
  const playing = usePlayback((s) => s.playing);
  const audioReady = usePlayback((s) => s.audioReady);
  const beatsPerBar = usePlayback((s) => s.beatsPerBar);
  const currentBeat = usePlayback((s) => s.currentBeat);

  const lastTapRef = useRef(0);
  const tapTimesRef = useRef<number[]>([]);

  // Clean teardown on unmount: no ghost schedules or leaked nodes (SPEC §B).
  useEffect(() => {
    return () => {
      stopTransport();
      disposeMetronome();
    };
  }, []);

  function startPlaying() {
    const { bpm, beatsPerBar } = usePlayback.getState();
    configureTransport({ bpm, timeSignature: [beatsPerBar, 4] });
    startMetronome(beatsPerBar, (beat) => usePlayback.getState().setCurrentBeat(beat));
    startTransport();
    usePlayback.getState().setPlaying(true);
  }

  function stopPlaying() {
    stopTransport();
    stopMetronome();
    const s = usePlayback.getState();
    s.setPlaying(false);
    s.setCurrentBeat(-1);
    lastTapRef.current = 0; // next tap is a fresh control tap, not a tempo tap
    tapTimesRef.current = [];
  }

  async function handleTap() {
    const now = performance.now();
    const delta = now - lastTapRef.current;

    await ensureAudioStarted();
    usePlayback.getState().setAudioReady(true);

    const wasPlaying = usePlayback.getState().playing;

    // Control tap: isolated press → start (at current tempo) or stop.
    if (delta > TAP_GAP_MS) {
      lastTapRef.current = now;
      tapTimesRef.current = [now];
      if (wasPlaying) stopPlaying();
      else startPlaying();
      return;
    }

    // Debounce implausibly fast double-fires.
    if (delta < MIN_TAP_INTERVAL_MS) return;
    lastTapRef.current = now;

    // Tempo tap: refine BPM from the rolling average of inter-tap intervals.
    const times = [...tapTimesRef.current, now].slice(-TAP_WINDOW);
    tapTimesRef.current = times;

    if (times.length >= 2) {
      const intervals = times.slice(1).map((t, i) => t - times[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const tapped = Math.round(60000 / avg);

      const s = usePlayback.getState();
      s.setBpm(tapped); // clamps
      setEngineBpm(usePlayback.getState().bpm);
    }

    if (!wasPlaying) startPlaying();
    else getTransport().position = 0; // realign the downbeat to the tap
  }

  const accent = currentBeat === 0;

  return (
    <div className="flex flex-col items-center gap-10">
      {/* Big clickable / tappable metronome */}
      <button
        onClick={handleTap}
        aria-label={playing ? "Tap tempo or stop" : "Tap to start or set tempo"}
        className="group relative grid h-64 w-64 place-items-center rounded-full
                   border border-foreground/15 bg-foreground/[0.02]
                   transition-colors hover:bg-foreground/[0.04]
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      >
        {/* Pulse ring — keyed on beat so it re-triggers every tick, in audio sync */}
        <span
          key={currentBeat}
          className={`pointer-events-none absolute inset-0 rounded-full ${
            playing ? "animate-[ping_0.6s_ease-out_1]" : ""
          } ${accent ? "bg-foreground/10" : "bg-foreground/[0.04]"}`}
        />
        <span className="z-10 select-none text-center text-lg font-medium tracking-wide">
          {playing ? "Stop" : audioReady ? "Tap" : "Tap to start"}
        </span>
      </button>

      {/* Beat dots */}
      <div className="flex items-center gap-4" aria-hidden>
        {Array.from({ length: beatsPerBar }).map((_, i) => {
          const active = playing && i === currentBeat;
          const isOne = i === 0;
          return (
            <span
              key={i}
              className={`h-3 w-3 rounded-full transition-all duration-75 ${
                active
                  ? isOne
                    ? "scale-150 bg-foreground"
                    : "scale-125 bg-foreground/70"
                  : "bg-foreground/15"
              }`}
            />
          );
        })}
      </div>

      <BpmControl />
    </div>
  );
}
