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
  getTransport,
} from "./engine";
import { startMetronome, stopMetronome, type MetronomeConfig } from "./metronome";
import { usePlayback } from "@/lib/store/playback";
import { useHarmony } from "@/lib/store/harmony";

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

// True when the click track was started *by* the progression's Play button (not the user
// directly). That's the only case where stopping the progression should also stop clicks.
let progressionOwnsMetronome = false;

/** Start the click track on the shared transport (caller has set audioReady). */
function startClicks(): void {
  const s = usePlayback.getState();
  configureTransport({ bpm: s.bpm, timeSignature: [s.beatsPerBar, 4], swing: s.swing });
  startMetronome(getConfig, onBeat);
  // Don't restart a transport the progression already has running — that would jump the
  // progression back to the top. startMetronome seeds its grid from the live position.
  if (getTransport().state !== "started") startTransport();
  s.setPlaying(true);
}

/** Stop the click track, leaving the shared transport alone if the progression rides it. */
function stopClicks(): void {
  const s = usePlayback.getState();
  stopMetronome();
  s.setPlaying(false);
  s.setCurrentBeat(-1);
  if (!useHarmony.getState().progressionPlaying) stopTransport();
}

/** Start or stop the metronome. Unlocks audio on first call (must be from a gesture). */
export async function toggleMetronome(): Promise<void> {
  await ensureAudioStarted();
  const s = usePlayback.getState();
  s.setAudioReady(true);
  // Toggling by hand means the user owns the click track now, not the progression.
  progressionOwnsMetronome = false;
  if (s.playing) stopClicks();
  else startClicks();
}

/**
 * Start the click track alongside the progression so Play gives you an audible pulse.
 * No-op if the metronome is already running (we don't seize a user-started click track).
 */
export async function startMetronomeForProgression(): Promise<void> {
  await ensureAudioStarted();
  const s = usePlayback.getState();
  s.setAudioReady(true);
  if (s.playing) return;
  startClicks();
  progressionOwnsMetronome = true;
}

/** Stop the click track, but only if the progression is what started it. */
export function stopMetronomeForProgression(): void {
  if (!progressionOwnsMetronome) return;
  progressionOwnsMetronome = false;
  stopClicks();
}
