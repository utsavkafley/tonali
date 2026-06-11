"use client";

/**
 * Chord diagram (Chords pillar) — a small vertical chord-chart grid (low E on the left,
 * the way printed chord charts read) for the hover popover on the progression. Pure
 * presentation: it draws whatever fingering `chordShape` resolved — filled dots for
 * fretted notes, ○ for open strings, ✕ for muted, and an "Nfr" label when the window
 * starts above the nut.
 */
import { useMemo } from "react";
import { useHarmony } from "@/lib/store/harmony";
import { chordShape } from "@/lib/theory/chordShapes";
import { chordLabel, type ChordChoice } from "@/lib/theory/scales";

const ACCENT = "#ff5a3c";

const COL = 15; // string spacing
const ROW = 18; // fret spacing
const PAD_X = 12;
const HEAD = 20; // room above the nut for ○/✕ markers
const PAD_BOTTOM = 6;
const DOT = 5.5;

export function ChordDiagram({ chord }: { chord: ChordChoice }) {
  const { tuning, handedness } = useHarmony();
  const shape = useMemo(
    () => chordShape(chord, tuning),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chord.root, chord.type, tuning],
  );

  if (!shape) return null;
  const { frets, baseFret, fretSpan } = shape;

  const strings = frets.length;
  const width = PAD_X * 2 + (strings - 1) * COL;
  const height = HEAD + fretSpan * ROW + PAD_BOTTOM;
  const nutY = HEAD;

  // String index → x. Low E on the left for a right-handed player; flipped for lefties.
  const xOf = (s: number) =>
    PAD_X + (handedness === "left" ? strings - 1 - s : s) * COL;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="text-foreground"
      role="img"
      aria-label={`${chordLabel(chord)} chord shape`}
    >
      {/* Frets (horizontal). The top wire is a thick nut only at the very start. */}
      {Array.from({ length: fretSpan + 1 }).map((_, i) => {
        const y = nutY + i * ROW;
        const isNut = i === 0 && baseFret === 1;
        return (
          <line
            key={`fret-${i}`}
            x1={PAD_X}
            y1={y}
            x2={PAD_X + (strings - 1) * COL}
            y2={y}
            stroke="currentColor"
            strokeOpacity={isNut ? 0.8 : 0.3}
            strokeWidth={isNut ? 3 : 1}
          />
        );
      })}

      {/* Strings (vertical) */}
      {Array.from({ length: strings }).map((_, s) => (
        <line
          key={`str-${s}`}
          x1={xOf(s)}
          y1={nutY}
          x2={xOf(s)}
          y2={nutY + fretSpan * ROW}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={1}
        />
      ))}

      {/* Position label, e.g. "3fr", when the window doesn't start at the nut. */}
      {baseFret > 1 && (
        <text
          x={PAD_X + (strings - 1) * COL + 4}
          y={nutY + ROW / 2}
          dominantBaseline="central"
          fontSize={9}
          fontFamily="monospace"
          fill="currentColor"
          opacity={0.55}
        >
          {baseFret}fr
        </text>
      )}

      {/* Per-string markers: dot (fretted), ○ (open), ✕ (muted). */}
      {frets.map((f, s) => {
        const x = xOf(s);
        if (f == null) {
          return (
            <text
              key={`m-${s}`}
              x={x}
              y={HEAD - 11}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fill="currentColor"
              opacity={0.45}
              fontFamily="monospace"
            >
              ✕
            </text>
          );
        }
        if (f === 0) {
          return (
            <circle
              key={`m-${s}`}
              cx={x}
              cy={HEAD - 11}
              r={4}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.55}
              strokeWidth={1.3}
            />
          );
        }
        const y = nutY + (f - baseFret + 0.5) * ROW;
        return <circle key={`m-${s}`} cx={x} cy={y} r={DOT} fill={ACCENT} />;
      })}
    </svg>
  );
}
