/**
 * Metronome — beat scheduling + the click sound source.
 *
 * SPEC §D: The sound source is isolated behind `playClick()` so it can later be
 * swapped for a drum sample (rimshot / hi-hat / click stick) with zero changes to
 * the scheduling code. Beat index is derived from transport ticks, not a counter,
 * so it never drifts and survives live tempo changes.
 */
import * as Tone from "tone";
import { getTransport, getDraw } from "./engine";

/** A click sound source. Today: synth. Tomorrow: a drum sample (same interface). */
interface ClickVoice {
  play(time: number, accent: boolean): void;
  dispose(): void;
}

/**
 * Synth click voice. SPEC §"Sound Sourcing": synthesis is the right tool for a
 * tick — there's no acoustic original to fall short of. Accent = higher + louder.
 */
function createSynthClick(): ClickVoice {
  const synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
  }).toDestination();
  synth.volume.value = -6;

  return {
    play(time, accent) {
      synth.triggerAttackRelease(accent ? "C7" : "C6", "32n", time, accent ? 1 : 0.7);
    },
    dispose() {
      synth.dispose();
    },
  };
}

export type OnBeat = (beatInBar: number) => void;

let voice: ClickVoice | null = null;
let scheduleId: number | null = null;

/**
 * Schedule a click on every beat. Does NOT start the transport — the engine owns
 * that. Idempotent: calling start twice clears the prior schedule first, so
 * StrictMode double-invoke can't double the clicks (SPEC §B).
 */
export function startMetronome(beatsPerBar: number, onBeat: OnBeat): void {
  stopMetronome();
  if (!voice) voice = createSynthClick();

  const t = getTransport();
  scheduleId = t.scheduleRepeat((time) => {
    const ticks = t.getTicksAtTime(time);
    const beatInBar = Math.round(ticks / t.PPQ) % beatsPerBar;
    const accent = beatInBar === 0;

    voice!.play(time, accent);

    // Paint the visual pulse in sync with the audio (SPEC §C: no separate timer).
    getDraw().schedule(() => onBeat(beatInBar), time);
  }, "4n");
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
