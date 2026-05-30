/**
 * Chord progressions — chart model and mini-syntax parser.
 *
 * Mini-syntax:
 *   newline      → new system (line in the chart)
 *   |            → barline (separates measures)
 *   spaces       → multiple chords within a bar
 *   |: … :|      → repeat section (plays twice by convention)
 *   |: … :|×N   → repeat section (plays N times); also accepts x instead of ×
 *
 * A line is either entirely a repeat block or entirely plain bars (v1 constraint).
 */
import { Note, Interval, Chord } from "tonal";
import type { ChordChoice, Bar, ScaleId } from "./scales";
import { chordText } from "./scales";

// ─── Data model ────────────────────────────────────────────────────────────

export type Section = {
  bars: Bar[];
  repeat: number; // 1 = plain (no brackets), ≥2 = has repeat signs + ×N label
};
export type SystemLine = Section[];
export type ChartData = { systems: SystemLine[] };

/** One playback event — a single chord at a position in the chart (with repeat context). */
export type PlayStep = {
  chord: ChordChoice;
  systemIdx: number;
  sectionIdx: number;
  barInSection: number;
  chordInBar: number;
  barFraction: number; // fraction of a bar (1 / chordsInBar) → used for scheduling
  repeatIdx: number;   // which repetition (0-indexed) → used for ×N/×M progress display
};

// ─── Presets ───────────────────────────────────────────────────────────────

export type ProgressionPreset = {
  id: string;
  name: string;
  degrees: [semitone: number, type: string][];
  suggestedScale: ScaleId;
};

export const PROGRESSIONS: ProgressionPreset[] = [
  { id: "I-V-vi-IV", name: "I–V–vi–IV (Pop)", suggestedScale: "major_pentatonic",
    degrees: [[0,""], [7,""], [9,"m"], [5,""]] },
  { id: "I-vi-IV-V", name: "I–vi–IV–V (50s)", suggestedScale: "major_pentatonic",
    degrees: [[0,""], [9,"m"], [5,""], [7,""]] },
  { id: "ii-V-I", name: "ii–V–I (Jazz)", suggestedScale: "major",
    degrees: [[2,"m7"], [7,"7"], [0,"maj7"]] },
  {
    id: "blues12", name: "12-bar Blues", suggestedScale: "blues",
    degrees: [
      [0,"7"],[0,"7"],[0,"7"],[0,"7"],
      [5,"7"],[5,"7"],[0,"7"],[0,"7"],
      [7,"7"],[5,"7"],[0,"7"],[7,"7"],
    ],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseChord(token: string): ChordChoice | null {
  const tok = token.charAt(0).toUpperCase() + token.slice(1);
  const c = Chord.get(tok);
  if (c.empty || !c.tonic) return null;
  return { root: c.tonic, type: tok.slice(c.tonic.length) };
}

function parseBarsText(text: string): Bar[] {
  return text
    .split("|")
    .map((barStr) =>
      barStr.trim().split(/\s+/).map(parseChord).filter((c): c is ChordChoice => c !== null),
    )
    .filter((bar) => bar.length > 0);
}

function parseSystemLine(line: string): SystemLine {
  const trimmed = line.trim();
  if (!trimmed) return [];

  // Check for |: … :|×N or |: … :|
  const repeatMatch = trimmed.match(/^\|:\s*(.+?)\s*:\|(?:(?:×|x)(\d+))?$/);
  if (repeatMatch) {
    const bars = parseBarsText(repeatMatch[1]);
    const repeat = repeatMatch[2] ? parseInt(repeatMatch[2], 10) : 2;
    return bars.length ? [{ bars, repeat }] : [];
  }

  const bars = parseBarsText(trimmed);
  return bars.length ? [{ bars, repeat: 1 }] : [];
}

// ─── Build play steps ──────────────────────────────────────────────────────

function buildPlaySteps(chartData: ChartData): PlayStep[] {
  const steps: PlayStep[] = [];
  chartData.systems.forEach((system, sIdx) => {
    system.forEach((section, secIdx) => {
      for (let rep = 0; rep < section.repeat; rep++) {
        section.bars.forEach((bar, bIdx) => {
          bar.forEach((chord, cIdx) => {
            steps.push({
              chord,
              systemIdx: sIdx,
              sectionIdx: secIdx,
              barInSection: bIdx,
              chordInBar: cIdx,
              barFraction: 1 / bar.length,
              repeatIdx: rep,
            });
          });
        });
      }
    });
  });
  return steps;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function parseChartText(text: string): { chartData: ChartData; playSteps: PlayStep[] } {
  const systems = text
    .split("\n")
    .map(parseSystemLine)
    .filter((s) => s.length > 0);
  const chartData: ChartData = { systems };
  return { chartData, playSteps: buildPlaySteps(chartData) };
}

export function chartDataToText(chartData: ChartData): string {
  return chartData.systems
    .map((sys) =>
      sys
        .map((sec) => {
          const bars = sec.bars.map((bar) => bar.map(chordText).join(" ")).join(" | ");
          return sec.repeat > 1 ? `|: ${bars} :|×${sec.repeat}` : bars;
        })
        .join(" "),
    )
    .join("\n");
}

export function transposeChart(
  chartData: ChartData,
  fromRoot: string,
  toRoot: string,
): ChartData {
  const iv = Interval.distance(fromRoot, toRoot);
  const t = (c: ChordChoice): ChordChoice => ({
    root: Note.transpose(c.root, iv) || c.root,
    type: c.type,
  });
  return {
    systems: chartData.systems.map((sys) =>
      sys.map((sec) => ({
        bars: sec.bars.map((bar) => bar.map(t)),
        repeat: sec.repeat,
      })),
    ),
  };
}

export function buildChartFromPreset(
  keyRoot: string,
  preset: ProgressionPreset,
): { chartData: ChartData; playSteps: PlayStep[] } {
  const bars: Bar[] = preset.degrees.map(([semitone, type]) => [
    { root: Note.transpose(keyRoot, Interval.fromSemitones(semitone)) || keyRoot, type },
  ]);
  // Lay out with 4 bars per system line
  const systemBars: Bar[][] = [];
  for (let i = 0; i < bars.length; i += 4) systemBars.push(bars.slice(i, i + 4));
  const chartData: ChartData = {
    systems: systemBars.map((sb) => [{ bars: sb, repeat: 1 }]),
  };
  return { chartData, playSteps: buildPlaySteps(chartData) };
}

/** Flatten all unique bars (no repeats) — for key-transposition reference. */
export function flatBars(chartData: ChartData): Bar[] {
  const bars: Bar[] = [];
  chartData.systems.forEach((sys) => sys.forEach((sec) => sec.bars.forEach((b) => bars.push(b))));
  return bars;
}
