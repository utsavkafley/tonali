/**
 * Progression clock (Chords pillar, slice 3). A Tone.Part that advances
 * currentPlayIndex on each chord boundary, looping indefinitely. Shares the same
 * transport as the metronome — both run together on one clock.
 */
import * as Tone from "tone";
import { getTransport, getDraw, ensureAudioStarted, startTransport } from "./engine";
import { useHarmony } from "@/lib/store/harmony";
import { usePlayback } from "@/lib/store/playback";

let part: Tone.Part | null = null;

/**
 * Start the progression clock, optionally launching at a future offset (e.g. from
 * mic beat detection). `startDelayMs` = ms from now to the first beat; 0 = immediate.
 */
export async function startProgressionClock(startDelayMs = 0): Promise<void> {
  await ensureAudioStarted();
  stopProgressionClock();

  const { playSteps } = useHarmony.getState();
  const { beatsPerBar } = usePlayback.getState();
  if (playSteps.length === 0) return;

  const ppq = getTransport().PPQ;
  let cursor = 0;
  const events: Array<{ time: string; index: number }> = [];

  playSteps.forEach((step, i) => {
    events.push({ time: `${Math.round(cursor)}i`, index: i });
    cursor += step.barFraction * beatsPerBar * ppq;
  });

  const loopEndTicks = Math.round(cursor);

  part = new Tone.Part(
    (time: number, { index }: { index: number }) => {
      getDraw().schedule(() => {
        useHarmony.getState().setCurrentPlayIndex(index);
      }, time);
    },
    events,
  ) as unknown as Tone.Part;

  (part as any).loop = true;
  (part as any).loopEnd = `${loopEndTicks}i`;
  (part as any).start(0);

  // Start the transport, scheduled to the beat if a delay was provided
  if (getTransport().state !== "started") {
    if (startDelayMs > 0) {
      getTransport().start(`+${(startDelayMs / 1000).toFixed(4)}`);
    } else {
      startTransport();
    }
  }
}

export function stopProgressionClock(): void {
  if (part) {
    try {
      (part as any).stop();
      (part as any).dispose();
    } catch {
      // already disposed
    }
    part = null;
  }
}
