"use client";

/**
 * Fretboard (Next Pillar §B/§F) — a dumb SVG renderer driven by the harmonic-context
 * store + the pure theory layer. Draws strings/frets/inlays and places degree-labelled
 * markers where the current key+scale lands. Right-handed by default (nut left); a left
 * handedness flips the fret order.
 */
import { useMemo, useState } from "react";
import { useHarmony } from "@/lib/store/harmony";
import { buildFretboardContext, type NoteRole } from "@/lib/theory/scales";
import {
  fretboardMarkers,
  SINGLE_INLAYS,
  DOUBLE_INLAYS,
} from "@/lib/theory/fretboard";

const ACCENT = "#ff5a3c";

/** Visual tier per role: accent (roots) > solid (chord tones) > outlined (passing). */
function markerStyle(role: NoteRole) {
  switch (role) {
    case "root":
    case "chordRoot":
      return { fill: ACCENT, stroke: ACCENT, strokeOpacity: 1, text: "#fff", weight: 700 };
    case "chordTone":
      return {
        fill: "currentColor",
        stroke: "currentColor",
        strokeOpacity: 1,
        text: "var(--background)",
        weight: 700,
      };
    default: // scaleTone (passing)
      return {
        fill: "var(--background)",
        stroke: "currentColor",
        strokeOpacity: 0.5,
        text: "currentColor",
        weight: 500,
      };
  }
}

const CELL_W = 54;
const STRING_GAP = 32;
const PAD_X = 28;
const PAD_TOP = 22;
const NUM_H = 30;
const R = 13;

export function Fretboard() {
  const { root, scale, tuning, handedness, fromFret, toFret, showDegrees, chordRoot, chordType } =
    useHarmony();
  const [hovered, setHovered] = useState<string | null>(null);

  const context = useMemo(
    () => buildFretboardContext(root, scale, chordRoot ? { root: chordRoot, type: chordType } : null),
    [root, scale, chordRoot, chordType],
  );
  const markers = useMemo(
    () => fretboardMarkers(tuning, fromFret, toFret, context),
    [tuning, fromFret, toFret, context],
  );

  const frets = [];
  for (let f = fromFret; f <= toFret; f++) frets.push(f);
  const cols = frets.length;
  const strings = tuning.length;

  const width = PAD_X * 2 + cols * CELL_W;
  const height = PAD_TOP * 2 + (strings - 1) * STRING_GAP + NUM_H;

  // Column index for a fret, flipped for left-handed.
  const colOf = (fret: number) => {
    const i = fret - fromFret;
    return handedness === "left" ? cols - 1 - i : i;
  };
  const xCenter = (fret: number) => PAD_X + colOf(fret) * CELL_W + CELL_W / 2;
  // String 0 = low E at the top, high E at the bottom.
  const yString = (s: number) => PAD_TOP + (strings - 1 - s) * STRING_GAP;
  const yMid = PAD_TOP + ((strings - 1) * STRING_GAP) / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-3xl text-foreground"
      role="img"
      aria-label={`${root} ${scale} on the fretboard, frets ${fromFret} to ${toFret}`}
    >
      {/* Inlays (drawn behind everything) */}
      {frets.map((f) => {
        const x = xCenter(f);
        if (DOUBLE_INLAYS.includes(f)) {
          return (
            <g key={`inlay-${f}`} fill="currentColor" opacity={0.12}>
              <circle cx={x} cy={yMid - STRING_GAP} r={5} />
              <circle cx={x} cy={yMid + STRING_GAP} r={5} />
            </g>
          );
        }
        if (SINGLE_INLAYS.includes(f)) {
          return <circle key={`inlay-${f}`} cx={x} cy={yMid} r={5} fill="currentColor" opacity={0.12} />;
        }
        return null;
      })}

      {/* Strings (horizontal) */}
      {Array.from({ length: strings }).map((_, s) => (
        <line
          key={`str-${s}`}
          x1={PAD_X}
          y1={yString(s)}
          x2={PAD_X + cols * CELL_W}
          y2={yString(s)}
          stroke="currentColor"
          strokeOpacity={0.25}
          strokeWidth={1 + (strings - 1 - s) * 0.25}
        />
      ))}

      {/* Fret wires (vertical). The left edge is the nut when the window starts at 0. */}
      {Array.from({ length: cols + 1 }).map((_, i) => {
        const x = PAD_X + i * CELL_W;
        const isNut = fromFret === 0 && (handedness === "left" ? i === cols : i === 0);
        return (
          <line
            key={`fret-${i}`}
            x1={x}
            y1={yString(strings - 1)}
            x2={x}
            y2={yString(0)}
            stroke="currentColor"
            strokeOpacity={isNut ? 0.7 : 0.25}
            strokeWidth={isNut ? 4 : 1}
          />
        );
      })}

      {/* Fret numbers */}
      {frets.map((f) => (
        <text
          key={`num-${f}`}
          x={xCenter(f)}
          y={height - 8}
          textAnchor="middle"
          fontSize={12}
          fill="currentColor"
          opacity={0.45}
          fontFamily="monospace"
        >
          {f}
        </text>
      ))}

      {/* Note markers — label shows the degree; hovering flips it to the note name.
          Roots & chord roots = accent fill; chord tones = solid fill; passing = outlined. */}
      {markers.map(({ string, fret, note }) => {
        const x = xCenter(fret);
        const y = yString(string);
        const s = markerStyle(note.role);
        const key = `${string}-${fret}`;
        const primary = showDegrees ? note.degree : note.name;
        const alternate = showDegrees ? note.name : note.degree;
        const label = hovered === key ? alternate : primary;
        return (
          <g
            key={`m-${key}`}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
          >
            <circle
              cx={x}
              cy={y}
              r={R}
              fill={s.fill}
              stroke={s.stroke}
              strokeOpacity={s.strokeOpacity}
              strokeWidth={1.5}
            />
            <text
              x={x}
              y={y + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={s.weight}
              fill={s.text}
              fontFamily="monospace"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
