/**
 * Fretboard geometry helper (Next Pillar §B/§F). Pure: maps a tuning + fret window +
 * a scale's chroma map to the note markers that fall in the window. Knows nothing about
 * SVG — the component draws; this decides what's there.
 */
import { Note } from "tonal";
import type { ScaleNote } from "./scales";

/** Standard tuning, low → high string. */
export const STANDARD_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"];

export const FRET_MAX = 22;

/** Frets that get position-marker inlays (single dots), and the double-dot octaves. */
export const SINGLE_INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];
export const DOUBLE_INLAYS = [12, 24];

export type FretMarker = {
  string: number; // 0 = low E (tuning index)
  fret: number;
  note: ScaleNote;
};

/** Active notes within [fromFret, toFret] for the given tuning + scale chroma map. */
export function fretboardMarkers(
  tuning: string[],
  fromFret: number,
  toFret: number,
  scaleMap: Map<number, ScaleNote>,
): FretMarker[] {
  const markers: FretMarker[] = [];
  tuning.forEach((open, string) => {
    const openChroma = Note.chroma(open) ?? 0;
    for (let fret = fromFret; fret <= toFret; fret++) {
      const chroma = (openChroma + fret) % 12;
      const note = scaleMap.get(chroma);
      if (note) markers.push({ string, fret, note });
    }
  });
  return markers;
}
