/**
 * Drum state — pattern selection, mutes, volume, enabled flag.
 * Decoupled from the audio engine so the store is always safe to import.
 */
import { create } from "zustand";
import {
  DRUM_PATTERNS,
  DRUM_INSTRUMENTS,
  type DrumInstrument,
  type DrumPattern,
} from "@/lib/theory/drumPatterns";

interface DrumState {
  enabled: boolean;
  pattern: DrumPattern;
  mutes: Record<DrumInstrument, boolean>;
  /** Volume in dB (-40..0) */
  volumeDb: number;
  /** Current 16th-note step (for visual feedback) */
  currentStep: number;

  setEnabled: (enabled: boolean) => void;
  setPatternById: (id: string) => void;
  toggleMute: (inst: DrumInstrument) => void;
  setVolumeDb: (db: number) => void;
  setCurrentStep: (step: number) => void;
}

const defaultMutes = (): Record<DrumInstrument, boolean> =>
  Object.fromEntries(DRUM_INSTRUMENTS.map((i) => [i, false])) as Record<DrumInstrument, boolean>;

export const useDrums = create<DrumState>((set) => ({
  enabled: false,
  pattern: DRUM_PATTERNS[0], // Rock
  mutes: defaultMutes(),
  volumeDb: -6,
  currentStep: -1,

  setEnabled: (enabled) => set({ enabled }),
  setPatternById: (id) => {
    const p = DRUM_PATTERNS.find((p) => p.id === id);
    if (p) set({ pattern: p });
  },
  toggleMute: (inst) =>
    set((s) => ({
      mutes: { ...s.mutes, [inst]: !s.mutes[inst] },
    })),
  setVolumeDb: (volumeDb) => set({ volumeDb }),
  setCurrentStep: (currentStep) => set({ currentStep }),
}));
