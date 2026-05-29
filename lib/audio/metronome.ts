/**
 * Metronome — beat scheduling + the click sound source.
 *
 * SPEC §D: The sound source is isolated behind a ClickVoice so it can later be
 * swapped for a drum sample with zero changes to scheduling. SPEC Step 3: the click
 * has three levels (stressed / normal / subdivision) and the scheduler is
 * subdivision-aware. Beat/sub detection is derived from absolute transport ticks
 * (not a counter), so it never drifts and stays phase-locked across reschedules.
 */
import * as Tone from "tone";
import { getTransport, getDraw } from "./engine";
import type { Subdivision } from "@/lib/store/playback";

export type ClickLevel = "strong" | "normal" | "sub";

/** A click sound source. Today: synth. Tomorrow: a drum sample (same interface). */
interface ClickVoice {
  play(time: number, level: ClickLevel): void;
  dispose(): void;
}

/**
 * Synth click voice. SPEC §"Sound Sourcing": synthesis is the right tool for a tick.
 * Stressed = highest + loudest, normal = mid, subdivision = quiet in-between.
 */
function createSynthClick(): ClickVoice {
  const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
  }).toDestination();
  synth.volume.value = -6;

  const spec: Record<ClickLevel, { note: string; velocity: number }> = {
    strong: { note: "C7", velocity: 1 },
    normal: { note: "C6", velocity: 0.7 },
    sub: { note: "C6", velocity: 0.32 },
  };

  return {
    play(time, level) {
      const { note, velocity } = spec[level];
      synth.triggerAttackRelease(note, "32n", time, velocity);
    },
    dispose() {
      synth.dispose();
    },
  };
}

/** Live config the scheduler reads on every tick, so meter/stress changes apply live. */
export interface MetronomeConfig {
  beatsPerBar: number;
  accents: boolean[];
  subdivision: Subdivision;
}

export type OnBeat = (beatInBar: number) => void;

/**
 * Clicks are scheduled on a fine fixed grid of 12 ticks-per-beat. That grid evenly
 * contains every subdivision we offer — quarter (÷12), eighth (÷6), triplet (÷4),
 * sixteenth (÷3) — so changing subdivision never reschedules: we just gate which
 * grid ticks actually click. No reschedule means no mid-play glitch (SPEC Step 3).
 */
const GRID_PER_BEAT = 12;

let voice: ClickVoice | null = null;
let scheduleId: number | null = null;

/**
 * Schedule clicks on the fine grid. Does NOT start the transport (the engine owns
 * that). Idempotent: clears any prior schedule first, so StrictMode double-invoke
 * can't double the clicks.
 *
 * Pass a `getConfig` getter (not a snapshot) so subdivision, beats-per-bar and stress
 * all take effect live, with no rescheduling.
 */
export function startMetronome(getConfig: () => MetronomeConfig, onBeat: OnBeat): void {
  stopMetronome();
  if (!voice) voice = createSynthClick();

  const t = getTransport();
  const ppq = t.PPQ; // ticks per quarter (= per beat)
  const gridTicks = Math.round(ppq / GRID_PER_BEAT);

  scheduleId = t.scheduleRepeat((time) => {
    const cfg = getConfig();
    const ticks = Math.round(t.getTicksAtTime(time));
    const tickInBeat = ((ticks % ppq) + ppq) % ppq;

    // Does this grid tick land on a click for the current subdivision?
    const ticksPerClick = ppq / cfg.subdivision; // 1→ppq, 2→ppq/2, 3→ppq/3, 4→ppq/4
    if (tickInBeat % ticksPerClick !== 0) return;

    if (tickInBeat === 0) {
      const beatInBar = Math.round(ticks / ppq) % cfg.beatsPerBar;
      const level: ClickLevel = cfg.accents[beatInBar] ? "strong" : "normal";
      voice!.play(time, level);
      // Paint the visual pulse in sync with the audio (SPEC §C: no separate timer).
      getDraw().schedule(() => onBeat(beatInBar), time);
    } else {
      voice!.play(time, "sub");
    }
  }, `${gridTicks}i`);
}

/** Clear the scheduled clicks. Safe to call when nothing is scheduled. */
export function stopMetronome(): void {
  if (scheduleId !== null) {
    getTransport().clear(scheduleId);
    scheduleId = null;
  }
}

/** Tear down the sound source entirely (e.g. on full unmount). */
export function disposeMetronome(): void {
  stopMetronome();
  voice?.dispose();
  voice = null;
}
