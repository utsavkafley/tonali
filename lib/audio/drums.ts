/**
 * Drum engine (SPEC Sound Sourcing Strategy). Synthesises each drum sound
 * programmatically into an AudioBuffer (same pipeline as loading a WAV — swap the
 * buffer source later without touching callers). A Tone.Sequence fires hits every 16th
 * note, reading live state each tick so pattern/mute/volume changes apply instantly.
 */
import * as Tone from "tone";
import { getTransport, getDraw } from "./engine";
import { DRUM_INSTRUMENTS, type DrumInstrument } from "@/lib/theory/drumPatterns";
import { useDrums } from "@/lib/store/drums";
import { usePlayback } from "@/lib/store/playback";

// ─── Synthesis ─────────────────────────────────────────────────────────────

/** Each recipe writes samples into the provided Float32Array. */
type Recipe = (data: Float32Array, sampleRate: number) => void;

function makeBuf(ctx: AudioContext, dur: number, recipe: Recipe): AudioBuffer {
  const frames = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  recipe(buf.getChannelData(0), ctx.sampleRate);
  return buf;
}

const recipes: Record<DrumInstrument, Recipe> = {
  kick(data, sr) {
    let phase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      // Pitch sweep: 140 → 42 Hz
      const freq = 42 + 98 * Math.exp(-t / 0.022);
      phase += (2 * Math.PI * freq) / sr;
      const env = Math.exp(-t / 0.14);
      // Transient click
      const click = t < 0.006 ? 0.6 * Math.exp(-t / 0.0007) : 0;
      data[i] = (Math.sin(phase) * env + click) * 0.92;
    }
  },
  snare(data, sr) {
    let bodyPhase = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      // White noise component
      const noise = (Math.random() * 2 - 1) * Math.exp(-t / 0.13);
      // Body oscillator
      bodyPhase += (2 * Math.PI * 185) / sr;
      const body = Math.sin(bodyPhase) * Math.exp(-t / 0.055);
      data[i] = (noise * 0.65 + body * 0.35) * 0.82;
    }
  },
  hihatClosed(data, sr) {
    // Six detuned metallic partials (simulates metallic hi-hat tones)
    const freqs = [4047, 4353, 7560, 8765, 10233, 11975];
    const phases = freqs.map(() => 0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      let v = 0;
      for (let j = 0; j < freqs.length; j++) {
        phases[j] += (2 * Math.PI * freqs[j]) / sr;
        v += Math.sin(phases[j]);
      }
      data[i] = (v / freqs.length) * Math.exp(-t / 0.032) * 0.5;
    }
  },
  hihatOpen(data, sr) {
    const freqs = [4047, 4353, 7560, 8765, 10233, 11975];
    const phases = freqs.map(() => 0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sr;
      let v = 0;
      for (let j = 0; j < freqs.length; j++) {
        phases[j] += (2 * Math.PI * freqs[j]) / sr;
        v += Math.sin(phases[j]);
      }
      const env = Math.exp(-t / 0.22) * (1 - Math.exp(-t / 0.004));
      data[i] = (v / freqs.length) * env * 0.45;
    }
  },
};

// ─── Engine state ──────────────────────────────────────────────────────────

let players: Record<DrumInstrument, Tone.Player> | null = null;
let masterVol: Tone.Volume | null = null;
let sequence: Tone.Sequence<number> | null = null;
let initialized = false;

export async function initDrumEngine(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const ctx = Tone.getContext().rawContext as AudioContext;
  const durations: Record<DrumInstrument, number> = {
    kick: 0.45,
    snare: 0.22,
    hihatClosed: 0.08,
    hihatOpen: 0.45,
  };

  masterVol = new Tone.Volume(0).toDestination();
  players = {} as Record<DrumInstrument, Tone.Player>;

  for (const inst of DRUM_INSTRUMENTS) {
    const buf = makeBuf(ctx, durations[inst], recipes[inst]);
    const toneBuf = new Tone.ToneAudioBuffer();
    toneBuf.set(buf);
    const player = new Tone.Player(toneBuf).connect(masterVol);
    player.volume.value = 0; // dB, per-instrument trim if needed later
    players[inst] = player;
  }
}

export function startDrumSequence(): void {
  stopDrumSequence();
  if (!players) return;

  const steps = Array.from({ length: 16 }, (_, i) => i);

  sequence = new Tone.Sequence<number>(
    (time, step) => {
      const ds = useDrums.getState();
      if (!ds.enabled) return;

      const { pattern, mutes } = ds;

      for (const inst of DRUM_INSTRUMENTS) {
        if (mutes[inst]) continue;
        if (pattern.steps[inst][step]) {
          players![inst].start(time);
        }
      }

      // Drive the beat-flash animation for the drum indicator (optional)
      if (step % 4 === 0) {
        const beat = step / 4;
        getDraw().schedule(() => {
          useDrums.getState().setCurrentStep(step);
        }, time);
      }
    },
    steps,
    "16n",
  );

  sequence.loop = true;
  (sequence as any).start(0);
}

export function stopDrumSequence(): void {
  if (sequence) {
    try {
      (sequence as any).stop();
      (sequence as any).dispose();
    } catch {
      // already disposed
    }
    sequence = null;
  }
}

export function setDrumVolume(db: number): void {
  if (masterVol) masterVol.volume.value = db;
}

/** Trigger a single drum hit immediately — for pad triggers. */
export function triggerDrum(inst: DrumInstrument): void {
  if (players?.[inst]) players[inst].start(Tone.now());
}

export function disposeDrumEngine(): void {
  stopDrumSequence();
  if (players) {
    for (const p of Object.values(players)) p.dispose();
    players = null;
  }
  masterVol?.dispose();
  masterVol = null;
  initialized = false;
}
