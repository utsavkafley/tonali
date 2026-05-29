/**
 * Playback state (SPEC §State). Pure UI/state only — no Tone.js here. Audio side
 * effects live in the component layer that calls the engine/metronome modules.
 */
import { create } from "zustand";

export const BPM_MIN = 40;
export const BPM_MAX = 240;
export const BPM_DEFAULT = 100;

export const BEATS_MIN = 1;
export const BEATS_MAX = 12;
export const BEATS_DEFAULT = 4;

/** Subdivisions per beat: 1 = quarter, 2 = eighth, 3 = triplet, 4 = sixteenth. */
export type Subdivision = 1 | 2 | 3 | 4;

interface PlaybackState {
  audioReady: boolean;
  playing: boolean;
  bpm: number;

  /** Beats per bar (time signature numerator). */
  beatsPerBar: number;
  /** Per-beat stress map; length === beatsPerBar. true = accented. */
  accents: boolean[];
  /** Clicks per beat. */
  subdivision: Subdivision;
  /** Current beat within the bar, 0-indexed. -1 = idle (no pulse). */
  currentBeat: number;

  setAudioReady: (ready: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setBpm: (bpm: number) => void;
  setBeatsPerBar: (n: number) => void;
  toggleAccent: (index: number) => void;
  setSubdivision: (sub: Subdivision) => void;
  setCurrentBeat: (beat: number) => void;
}

const clampBpm = (bpm: number) => Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));
const clampBeats = (n: number) => Math.min(BEATS_MAX, Math.max(BEATS_MIN, Math.round(n)));

/** Build an accent map of the given length, preserving prior values; beat 1 defaults on. */
const resizeAccents = (length: number, prev: boolean[] = []): boolean[] =>
  Array.from({ length }, (_, i) => prev[i] ?? i === 0);

export const usePlayback = create<PlaybackState>((set) => ({
  audioReady: false,
  playing: false,
  bpm: BPM_DEFAULT,
  beatsPerBar: BEATS_DEFAULT,
  accents: resizeAccents(BEATS_DEFAULT),
  subdivision: 1,
  currentBeat: -1,

  setAudioReady: (audioReady) => set({ audioReady }),
  setPlaying: (playing) => set({ playing }),
  setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
  setBeatsPerBar: (n) =>
    set((s) => {
      const beatsPerBar = clampBeats(n);
      return { beatsPerBar, accents: resizeAccents(beatsPerBar, s.accents) };
    }),
  toggleAccent: (index) =>
    set((s) => {
      const accents = s.accents.slice();
      accents[index] = !accents[index];
      return { accents };
    }),
  setSubdivision: (subdivision) => set({ subdivision }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
}));
