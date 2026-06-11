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
  mutes: boolean[];
  subdivision: Subdivision;
}

export type OnBeat = (beatInBar: number) => void;

/**
 * Clicks are scheduled on a fine fixed grid of 12 ticks-per-beat. That grid evenly
 * contains every subdivision we offer — quarter (÷12), eighth (÷6), triplet (÷4),
 * sixteenth (÷3) — so changing subdivision never reschedules: we just gate which
 * grid ticks actually click (SPEC Step 3).
 *
 * The grid position is tracked by a STEP COUNTER, not derived from the callback time.
 * Swing nudges the callback `time` later (Tone shifts off-beats) without moving the
 * tick source, so inverting time→ticks would mis-detect the beat. The counter is
 * swing-immune: we only use `time` to place the sound at its (swung) moment.
 */
const GRID_PER_BEAT = 12;

let voice: ClickVoice | null = null;
let scheduleId: number | null = null;
let step = 0;

/**
 * Schedule clicks on the fine grid, anchored at transport position 0 (the engine starts
 * the transport from 0). Idempotent: clears any prior schedule first, so StrictMode
 * double-invoke can't double the clicks.
 *
 * Pass a `getConfig` getter (not a snapshot) so subdivision, beats-per-bar, stress and
 * mutes all take effect live, with no rescheduling.
 */
export function startMetronome(getConfig: () => MetronomeConfig, onBeat: OnBeat): void {
  stopMetronome();
  if (!voice) voice = createSynthClick();

  const t = getTransport();
  const gridTicks = Math.round(t.PPQ / GRID_PER_BEAT);
  // Seed the step counter from the transport's current position so the click grid stays
  // phase-locked to bar 1 whether we start from a stopped transport (ticks 0) or join a
  // progression that's already running on the shared clock.
  step = Math.round(t.ticks / gridTicks);

  scheduleId = t.scheduleRepeat(
    (time) => {
      const idx = step++;
      const cfg = getConfig();

      const gridInBeat = idx % GRID_PER_BEAT; // 0..11 within the current beat
      const gridPerClick = GRID_PER_BEAT / cfg.subdivision; // 12/6/4/3
      if (gridInBeat % gridPerClick !== 0) return; // not a click for this subdivision

      const beatInBar = Math.floor(idx / GRID_PER_BEAT) % cfg.beatsPerBar;
      const isMainBeat = gridInBeat === 0;

      // The indicator advances on every main beat — even muted ones (you still see it).
      if (isMainBeat) getDraw().schedule(() => onBeat(beatInBar), time);

      if (cfg.mutes[beatInBar]) return; // silent beat: no sound (gap-click)

      if (isMainBeat) {
        const level: ClickLevel = cfg.accents[beatInBar] ? "strong" : "normal";
        voice!.play(time, level);
      } else {
        voice!.play(time, "sub");
      }
    },
    `${gridTicks}i`,
    0,
  );
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
