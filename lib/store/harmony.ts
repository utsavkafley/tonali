/**
 * Harmonic context (Next Pillar §C). Key, scale, fret window, tuning, handedness.
 * Progression: ChartData is the source of truth; playSteps is derived for playback.
 * currentPlayIndex drives both manual chord selection and transport-driven highlighting.
 */
import { create } from "zustand";
import type { ScaleId } from "@/lib/theory/scales";
import { STANDARD_TUNING, FRET_MAX } from "@/lib/theory/fretboard";
import {
  type ChartData,
  type PlayStep,
  type ProgressionPreset,
  parseChartText,
  chartDataToText,
  transposeChart,
  buildChartFromPreset,
} from "@/lib/theory/progressions";
import { Interval, Note } from "tonal";

export { FRET_MAX };

interface HarmonyState {
  root: string;
  scale: ScaleId;
  tuning: string[];
  handedness: "right" | "left";
  fromFret: number;
  toFret: number;
  showDegrees: boolean;

  // Standalone chord (used when no progression is loaded)
  chordRoot: string | null;
  chordType: string;

  // Progression
  chartData: ChartData | null;
  playSteps: PlayStep[];
  progressionId: string | null; // preset id, "custom", or null
  currentPlayIndex: number;     // index into playSteps (manual select + transport)
  progressionPlaying: boolean;

  setRoot: (root: string) => void;
  setScale: (scale: ScaleId) => void;
  setFretWindow: (fromFret: number, toFret: number) => void;
  setChordRoot: (root: string | null) => void;
  setChordType: (type: string) => void;

  loadPreset: (preset: ProgressionPreset) => void;
  setProgressionText: (text: string) => void;
  clearProgression: () => void;
  selectChord: (systemIdx: number, sectionIdx: number, barInSection: number, chordInBar: number) => void;
  setCurrentPlayIndex: (i: number) => void;
  setProgressionPlaying: (playing: boolean) => void;
}

const clampFret = (n: number) => Math.min(FRET_MAX, Math.max(0, Math.round(n)));

export const useHarmony = create<HarmonyState>((set, get) => ({
  root: "A",
  scale: "minor_pentatonic",
  tuning: STANDARD_TUNING,
  handedness: "right",
  fromFret: 0,
  toFret: 12,
  showDegrees: true,
  chordRoot: null,
  chordType: "",
  chartData: null,
  playSteps: [],
  progressionId: null,
  currentPlayIndex: 0,
  progressionPlaying: false,

  setRoot: (root) =>
    set((s) => {
      if (!s.chartData || root === s.root) return { root };
      // Transpose the loaded chart to the new key
      const chartData = transposeChart(s.chartData, s.root, root);
      const { playSteps } = parseChartText(chartDataToText(chartData));
      return { root, chartData, playSteps, progressionId: s.progressionId === "custom" ? "custom" : "custom" };
    }),

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

  loadPreset: (preset) => {
    const { chartData, playSteps } = buildChartFromPreset(get().root, preset);
    set({ chartData, playSteps, progressionId: preset.id, currentPlayIndex: 0,
          scale: preset.suggestedScale });
  },

  setProgressionText: (text) => {
    const { chartData, playSteps } = parseChartText(text);
    const hasContent = chartData.systems.length > 0;
    set((s) => ({
      chartData: hasContent ? chartData : null,
      playSteps: hasContent ? playSteps : [],
      progressionId: hasContent ? "custom" : null,
      currentPlayIndex: Math.min(s.currentPlayIndex, Math.max(0, playSteps.length - 1)),
    }));
  },

  clearProgression: () =>
    set({ chartData: null, playSteps: [], progressionId: null, currentPlayIndex: 0,
          progressionPlaying: false }),

  selectChord: (sIdx, secIdx, bIdx, cIdx) => {
    const { playSteps } = get();
    const i = playSteps.findIndex(
      (s) => s.systemIdx === sIdx && s.sectionIdx === secIdx &&
             s.barInSection === bIdx && s.chordInBar === cIdx,
    );
    if (i >= 0) set({ currentPlayIndex: i });
  },

  setCurrentPlayIndex: (i) => set({ currentPlayIndex: i }),
  setProgressionPlaying: (progressionPlaying) => set({ progressionPlaying }),
}));
