/**
 * Playback state (SPEC §State). Pure UI/state only — no Tone.js here. Audio side
 * effects live in the component layer that calls the engine/metronome modules.
 */
import { create } from "zustand";

export const BPM_MIN = 40;
export const BPM_MAX = 240;
export const BPM_DEFAULT = 100;
export const BEATS_PER_BAR = 4; // 4/4 for now; the engine treats this as a parameter.

interface PlaybackState {
  audioReady: boolean;
  playing: boolean;
  bpm: number;
  beatsPerBar: number;
  /** Current beat within the bar, 0-indexed. -1 = idle (no pulse). */
  currentBeat: number;

  setAudioReady: (ready: boolean) => void;
  setPlaying: (playing: boolean) => void;
  setBpm: (bpm: number) => void;
  setCurrentBeat: (beat: number) => void;
}

const clampBpm = (bpm: number) => Math.min(BPM_MAX, Math.max(BPM_MIN, Math.round(bpm)));

export const usePlayback = create<PlaybackState>((set) => ({
  audioReady: false,
  playing: false,
  bpm: BPM_DEFAULT,
  beatsPerBar: BEATS_PER_BAR,
  currentBeat: -1,

  setAudioReady: (audioReady) => set({ audioReady }),
  setPlaying: (playing) => set({ playing }),
  setBpm: (bpm) => set({ bpm: clampBpm(bpm) }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
}));
