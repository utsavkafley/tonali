/**
 * Metronome orchestration, decoupled from any view (Interaction Model). These are plain
 * functions over the store + engine — no React — so the metronome's audio lifecycle does
 * not depend on which layer is in focus. The full Metronome view and the docked mini both
 * call `toggleMetronome`; the surface owns the start-once subscription + teardown.
 */
import {
  ensureAudioStarted,
  configureTransport,
  startTransport,
  stopTransport,
} from "./engine";
import { startMetronome, stopMetronome, type MetronomeConfig } from "./metronome";
import { usePlayback } from "@/lib/store/playback";

/** Live config the scheduler reads each tick. */
export const getConfig = (): MetronomeConfig => {
  const s = usePlayback.getState();
  return {
    beatsPerBar: s.beatsPerBar,
    accents: s.accents,
    mutes: s.mutes,
    subdivision: s.subdivision,
  };
};

const onBeat = (beat: number) => usePlayback.getState().setCurrentBeat(beat);

/** Start or stop the metronome. Unlocks audio on first call (must be from a gesture). */
export async function toggleMetronome(): Promise<void> {
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
