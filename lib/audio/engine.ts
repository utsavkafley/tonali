/**
 * Audio engine — the single owner of Tone.js lifecycle.
 *
 * SPEC §A/§B/§C: This is the ONE module that touches the Tone Transport.
 * Components never import Tone directly; they call methods here. The engine is
 * idempotent (safe under React StrictMode double-invoke) and client-only.
 */
import * as Tone from "tone";

export type TimeSignature = [beatsPerBar: number, beatUnit: number];

let started = false;

/**
 * SPEC §A — AudioContext unlock. Must be called from inside a real user gesture.
 * Idempotent: calling it again after the context is running is a no-op.
 */
export async function ensureAudioStarted(): Promise<void> {
  if (started && Tone.getContext().state === "running") return;
  await Tone.start();
  started = true;
}

export function isAudioStarted(): boolean {
  return started && Tone.getContext().state === "running";
}

/**
 * SPEC §C — configure the clock for music from the start. Swing is wired in now
 * (default 0) and the time signature is a real parameter, not hard-coded 4/4.
 */
export function configureTransport(opts: {
  bpm: number;
  timeSignature?: TimeSignature;
  swing?: number; // 0..1, default 0
  swingSubdivision?: Tone.Unit.Subdivision; // default "8n"
}): void {
  const t = Tone.getTransport();
  t.bpm.value = opts.bpm;
  if (opts.timeSignature) t.timeSignature = opts.timeSignature;
  t.swing = opts.swing ?? 0;
  t.swingSubdivision = opts.swingSubdivision ?? "8n";
}

/** Live BPM change — applies immediately without restarting the transport (SPEC). */
export function setBpm(bpm: number): void {
  Tone.getTransport().bpm.value = bpm;
}

/** Start playback from the top of the bar so beat 1 lands first. */
export function startTransport(): void {
  const t = Tone.getTransport();
  t.position = 0;
  t.start();
}

export function stopTransport(): void {
  Tone.getTransport().stop();
}

/** Direct access for modules that schedule against the master clock (metronome). */
export function getTransport() {
  return Tone.getTransport();
}

/** Tone.Draw — paint visuals in sample-accurate sync with scheduled audio (SPEC). */
export function getDraw() {
  return Tone.getDraw();
}
