/**
 * Chord-shape resolver (Chords pillar) — given a chord symbol, derive a playable
 * guitar fingering for a chord-diagram popover. Pure: knows the tuning + chord tones,
 * not the SVG.
 *
 * Rather than hand-curate hundreds of voicings (and risk wrong notes), we *search* the
 * fretboard for a voicing built only from the chord's own pitch classes. The scoring is
 * tuned so that familiar low/open shapes win — preferring the root in the bass, full
 * chord-tone coverage, as many ringing strings as possible, and the lowest position —
 * which reconstructs the standard open/CAGED shapes for common chords (open C, G, E, Am,
 * D, …) while still producing a correct barre voicing for anything exotic.
 */
import { Chord, Note } from "tonal";
import { STANDARD_TUNING } from "./fretboard";
import type { ChordChoice } from "./scales";

/** A resolved fingering. `frets` is low→high string; null = muted, 0 = open, n = fret. */
export type ChordShape = {
  frets: (number | null)[];
  /** Lowest fret to draw the diagram window from (1 for open-position shapes). */
  baseFret: number;
  /** Number of frets the window spans (≥ 4, so diagrams share a consistent size). */
  fretSpan: number;
};

const MAX_SPAN = 3; // a hand reaches across 4 frets (p … p+3)
const MAX_BASE = 12; // search positions up to the octave

/**
 * Resolve a chord to a single fingering, or null if the symbol isn't a known chord.
 * `tuning` is low→high; defaults to standard tuning (chord charts assume standard).
 */
export function chordShape(
  chord: ChordChoice,
  tuning: string[] = STANDARD_TUNING,
): ChordShape | null {
  const c = Chord.get(`${chord.root}${chord.type}`);
  if (c.empty || !c.tonic) return null;

  const rootChroma = Note.chroma(c.tonic);
  if (rootChroma == null) return null;
  const tones = new Set<number>();
  for (const name of c.notes) {
    const ch = Note.chroma(name);
    if (ch != null) tones.add(ch);
  }
  if (tones.size === 0) return null;

  const open = tuning.map((n) => Note.chroma(n) ?? 0);

  const ref: { best: { frets: (number | null)[]; score: number } | null } = { best: null };

  for (let p = 0; p <= MAX_BASE; p++) {
    // Candidate frets per string at this position: open (0) plus the 4-fret window,
    // keeping only frets that land on a chord tone.
    const cand = open.map((o) => {
      const opts: number[] = [];
      if (tones.has(o % 12)) opts.push(0);
      for (let f = Math.max(1, p); f <= p + MAX_SPAN; f++) {
        if (tones.has((o + f) % 12)) opts.push(f);
      }
      return opts;
    });

    // Try every contiguous run of played strings [lo..hi] (no interior mutes — that's
    // what makes a diagram look like a real chord grip).
    for (let lo = 0; lo < open.length; lo++) {
      // The bass string must be able to sound the root.
      const rootFrets = cand[lo].filter((f) => (open[lo] + f) % 12 === rootChroma);
      if (rootFrets.length === 0) continue;

      for (let hi = lo; hi < open.length; hi++) {
        if (cand[hi].length === 0) break; // can't reach this far without a mute

        // Per-string options for the run — the bass string is pinned to a root fret.
        const options: number[][] = [];
        for (let s = lo; s <= hi; s++) options.push(s === lo ? rootFrets : cand[s]);
        const played = hi - lo + 1;

        // Enumerate every assignment (few options per string), keeping the best:
        // coverage dominates, then ringing strings, then low position, then low frets.
        const pick = new Array<number>(played);
        const evaluate = (s: number): void => {
          if (s === played) {
            const covered = new Set<number>();
            let fretSum = 0;
            for (let i = 0; i < played; i++) {
              covered.add((open[lo + i] + pick[i]) % 12);
              fretSum += pick[i];
            }
            const score = covered.size * 1000 + played * 40 - p * 30 - fretSum;
            if (!ref.best || score > ref.best.score) {
              const frets: (number | null)[] = open.map(() => null);
              for (let i = 0; i < played; i++) frets[lo + i] = pick[i];
              ref.best = { frets, score };
            }
            return;
          }
          for (const f of options[s]) {
            pick[s] = f;
            evaluate(s + 1);
          }
        };
        evaluate(0);
      }
    }
  }

  if (!ref.best) return null;
  const best = ref.best;

  const fretted = best.frets.filter((f): f is number => f != null && f > 0);
  const minFret = fretted.length ? Math.min(...fretted) : 1;
  const maxFret = fretted.length ? Math.max(...fretted) : 1;
  // Open shapes start the window at the nut; higher shapes start at their lowest fret.
  const baseFret = minFret <= 4 ? 1 : minFret;
  const fretSpan = Math.max(4, maxFret - baseFret + 1);

  return { frets: best.frets, baseFret, fretSpan };
}
