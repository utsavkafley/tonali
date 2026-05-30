/**
 * Pure theory layer (Next Pillar §A/§B) — no UI, no fretboard geometry. Answers
 * "given a key + scale, what notes, with what degree and role?" Notes are spelled in
 * context (Tonal.js) but we expose chroma (0–11) for pitch-class matching on the board.
 */
import { Scale, Note, Chord, Interval } from "tonal";

export type ScaleId =
  | "major"
  | "minor"
  | "major_pentatonic"
  | "minor_pentatonic"
  | "blues"
  | "dorian"
  | "mixolydian";

/** Catalog: our id → display name + Tonal scale name. */
export const SCALES: { id: ScaleId; name: string; tonal: string }[] = [
  { id: "major", name: "Major (Ionian)", tonal: "major" },
  { id: "minor", name: "Minor (Aeolian)", tonal: "minor" },
  { id: "major_pentatonic", name: "Major Pentatonic", tonal: "major pentatonic" },
  { id: "minor_pentatonic", name: "Minor Pentatonic", tonal: "minor pentatonic" },
  { id: "blues", name: "Blues (Minor)", tonal: "minor blues" },
  { id: "dorian", name: "Dorian", tonal: "dorian" },
  { id: "mixolydian", name: "Mixolydian", tonal: "mixolydian" },
];

/** The 12 roots offered in the key picker. */
export const ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Degree labels using interval *quality*: Δ = major, p = perfect, ♭ = minor/flat,
 * ♯ = augmented. More musically literate than bare numbers (teaches interval quality).
 */
const DEGREE_BY_INTERVAL: Record<string, string> = {
  "1P": "R",
  "2m": "♭2",
  "2M": "Δ2",
  "3m": "♭3",
  "3M": "Δ3",
  "4P": "p4",
  "4A": "♯4",
  "5d": "♭5",
  "5P": "p5",
  "6m": "♭6",
  "6M": "Δ6",
  "7m": "♭7",
  "7M": "Δ7",
};

export type Role = "root" | "scale";

export type ScaleNote = {
  name: string; // spelled in context, e.g. "Eb"
  chroma: number; // 0–11 pitch class for matching
  degree: string; // "R", "♭3", "5", "♭7"
  role: Role;
};

export function scaleName(id: ScaleId): string {
  return SCALES.find((s) => s.id === id)?.name ?? id;
}

/** The notes of `root id`, spelled, with degree + role. */
export function getScaleNotes(root: string, id: ScaleId): ScaleNote[] {
  const def = SCALES.find((s) => s.id === id);
  if (!def) return [];
  const scale = Scale.get(`${root} ${def.tonal}`);
  return scale.notes.map((name, i) => {
    const interval = scale.intervals[i];
    return {
      name,
      chroma: Note.chroma(name) ?? 0,
      degree: DEGREE_BY_INTERVAL[interval] ?? interval,
      role: interval === "1P" ? "root" : "scale",
    };
  });
}

/** Chroma → ScaleNote, for O(1) "is this fret in the scale, and what is it?" lookup. */
export function scaleChromaMap(root: string, id: ScaleId): Map<number, ScaleNote> {
  const map = new Map<number, ScaleNote>();
  for (const note of getScaleNotes(root, id)) map.set(note.chroma, note);
  return map;
}

/* ─────────────────────────── Chords (Slice 1) ─────────────────────────── */

/** Chord qualities offered in the picker → Tonal symbol suffix. */
export const CHORD_TYPES: { value: string; label: string }[] = [
  { value: "", label: "maj" },
  { value: "m", label: "min" },
  { value: "7", label: "7" },
  { value: "maj7", label: "maj7" },
  { value: "m7", label: "m7" },
  { value: "m7b5", label: "m7♭5" },
  { value: "dim", label: "dim" },
  { value: "aug", label: "aug" },
  { value: "sus4", label: "sus4" },
  { value: "6", label: "6" },
  { value: "9", label: "9" },
];

export type ChordChoice = { root: string; type: string };

/** A note as shown on the fretboard, with its role relative to the current context. */
export type NoteRole = "root" | "chordRoot" | "chordTone" | "scaleTone";
export type DisplayNote = { name: string; chroma: number; degree: string; role: NoteRole };

/** Degree label for any note relative to the key root (works for out-of-scale chord tones). */
function degreeFromKey(keyRoot: string, name: string): string {
  const iv = Interval.distance(keyRoot, name);
  return DEGREE_BY_INTERVAL[iv] ?? iv;
}

/**
 * Build the chroma → DisplayNote map the fretboard renders. Song-mode (Next Pillar §E):
 * one scale provides passing tones; if a chord is active, its tones are marked as chord
 * tones (filled) — including any that fall outside the scale, since chord tones always
 * work over the chord. Without a chord, the scale root is the emphasized note.
 */
export function buildFretboardContext(
  keyRoot: string,
  scaleId: ScaleId,
  chord: ChordChoice | null,
): Map<number, DisplayNote> {
  const map = new Map<number, DisplayNote>();

  for (const n of getScaleNotes(keyRoot, scaleId)) {
    map.set(n.chroma, {
      name: n.name,
      chroma: n.chroma,
      degree: n.degree,
      role: chord ? "scaleTone" : n.role === "root" ? "root" : "scaleTone",
    });
  }

  if (chord) {
    const c = Chord.get(`${chord.root}${chord.type}`);
    if (!c.empty) {
      const rootChroma = Note.chroma(c.tonic ?? chord.root) ?? -1;
      for (const name of c.notes) {
        const chroma = Note.chroma(name);
        if (chroma == null) continue;
        map.set(chroma, {
          name,
          chroma,
          degree: degreeFromKey(keyRoot, name),
          role: chroma === rootChroma ? "chordRoot" : "chordTone",
        });
      }
    }
  }

  return map;
}
