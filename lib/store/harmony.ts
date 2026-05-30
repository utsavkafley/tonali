/**
 * Harmonic context (Next Pillar §C) — the pitch-side analog of the playback clock.
 * Pure state: key, scale, fret window, tuning, handedness. The fretboard reads it
 * reactively. Parallel to (and composes with) the playback store, so scale practice can
 * run the metronome underneath. A `currentChord` field will join here when chords land.
 */
import { create } from "zustand";
import type { ScaleId } from "@/lib/theory/scales";
import { STANDARD_TUNING, FRET_MAX } from "@/lib/theory/fretboard";

export { FRET_MAX };

interface HarmonyState {
  root: string; // "A", "C#", …
  scale: ScaleId;
  tuning: string[]; // low → high
  handedness: "right" | "left"; // right default; left flips the board
  fromFret: number;
  toFret: number;
  showDegrees: boolean; // true = degree labels (default), false = note names (later)

  /** Current chord (Slice 1): null = none, just the scale. Later driven by a progression. */
  chordRoot: string | null;
  chordType: string; // Tonal suffix: "", "m", "7", "m7", …

  setRoot: (root: string) => void;
  setScale: (scale: ScaleId) => void;
  setFretWindow: (fromFret: number, toFret: number) => void;
  setChordRoot: (root: string | null) => void;
  setChordType: (type: string) => void;
}

const clampFret = (n: number) => Math.min(FRET_MAX, Math.max(0, Math.round(n)));

export const useHarmony = create<HarmonyState>((set) => ({
  root: "A",
  scale: "minor_pentatonic",
  tuning: STANDARD_TUNING,
  handedness: "right",
  fromFret: 0,
  toFret: 12,
  showDegrees: true,
  chordRoot: null,
  chordType: "",

  setRoot: (root) => set({ root }),
  setScale: (scale) => set({ scale }),
  setFretWindow: (from, to) =>
    set(() => {
      let fromFret = clampFret(from);
      let toFret = clampFret(to);
      if (fromFret > toFret) [fromFret, toFret] = [toFret, fromFret];
      return { fromFret, toFret };
    }),
  setChordRoot: (chordRoot) => set({ chordRoot }),
  setChordType: (chordType) => set({ chordType }),
}));
