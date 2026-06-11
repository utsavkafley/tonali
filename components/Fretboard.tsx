"use client";

/**
 * Fretboard (Next Pillar §B/§F) — a dumb SVG renderer driven by the harmonic-context
 * store + the pure theory layer. Draws strings/frets/inlays and places degree-labelled
 * markers where the current key+scale lands. Right-handed by default (nut left); a left
 * handedness flips the fret order.
 */
import { useMemo, useRef, useState } from "react";
import { useHarmony, FRET_MAX } from "@/lib/store/harmony";
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
  const {
    root, scale, tuning, handedness, fromFret, toFret, showDegrees,
    chordRoot, chordType, playSteps, currentPlayIndex, setFretWindow,
  } = useHarmony();
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeHandle, setActiveHandle] = useState<"from" | "to" | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ which: "from" | "to"; startX: number; from: number; to: number } | null>(
    null,
  );

  // Active chord: current playStep (manual or transport), else standalone chord.
  const activeChord =
    playSteps.length > 0
      ? playSteps[Math.min(currentPlayIndex, playSteps.length - 1)].chord
      : chordRoot
        ? { root: chordRoot, type: chordType }
        : null;

  const context = useMemo(
    () => buildFretboardContext(root, scale, activeChord ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [root, scale, activeChord?.root, activeChord?.type],
  );
  const markers = useMemo(
    () => fretboardMarkers(tuning, fromFret, toFret, context),
    [tuning, fromFret, toFret, context],
  );

  // When the window starts at 0, open strings are shown to the LEFT of the nut as
  // separate circles — fret 0 is removed from the column grid entirely.
  const showOpenStrings = fromFret === 0;
  const boardFrets: number[] = [];
  for (let f = showOpenStrings ? 1 : fromFret; f <= toFret; f++) boardFrets.push(f);
  const cols = boardFrets.length;
  const strings = tuning.length;

  const openMarkers = showOpenStrings ? markers.filter((m) => m.fret === 0) : [];
  const boardMarkers = showOpenStrings ? markers.filter((m) => m.fret > 0) : markers;

  const width = PAD_X * 2 + cols * CELL_W;
  const height = PAD_TOP * 2 + (strings - 1) * STRING_GAP + NUM_H;

  // Column index for a board fret (fret ≥ 1 when open strings are shown).
  const colOf = (fret: number) => {
    const i = fret - (showOpenStrings ? 1 : fromFret);
    return handedness === "left" ? cols - 1 - i : i;
  };
  const xCenter = (fret: number) => PAD_X + colOf(fret) * CELL_W + CELL_W / 2;
  // Open string circles sit at the left edge (right edge when left-handed).
  const xOpen = handedness === "right" ? PAD_X / 2 : PAD_X + cols * CELL_W + PAD_X / 2;
  // String 0 = low E at the top, high E at the bottom.
  const yString = (s: number) => PAD_TOP + (strings - 1 - s) * STRING_GAP;
  const yMid = PAD_TOP + ((strings - 1) * STRING_GAP) / 2;
  const boardTop = PAD_TOP;
  const boardBottom = PAD_TOP + (strings - 1) * STRING_GAP;

  // Drag the window edges to reframe the visible frets (replaces the sliders).
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const onHandleDown = (which: "from" | "to") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { which, startX: e.clientX, from: fromFret, to: toFret };
    setActiveHandle(which);
  };
  const onHandleMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!d || !rect) return;
    const pxPerCell = (rect.width / width) * CELL_W;
    const delta = Math.round((e.clientX - d.startX) / pxPerCell);
    if (d.which === "from") setFretWindow(clamp(d.from + delta, 0, d.to - 1), d.to);
    else setFretWindow(d.from, clamp(d.to + delta, d.from + 1, FRET_MAX));
  };
  const onHandleUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    setActiveHandle(null);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-3xl text-foreground"
      role="img"
      aria-label={`${root} ${scale} on the fretboard, frets ${fromFret} to ${toFret}`}
    >
      {/* Inlays (drawn behind everything) */}
      {boardFrets.map((f) => {
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

      {/* Strings — extend left to xOpen when open strings are shown */}
      {Array.from({ length: strings }).map((_, s) => (
        <line
          key={`str-${s}`}
          x1={showOpenStrings ? xOpen : PAD_X}
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

      {/* Fret numbers (skip 0 — open strings shown separately) */}
      {boardFrets.map((f) => (
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

      {/* Open-string indicators — circles to the LEFT of the nut */}
      {openMarkers.map(({ string, note }) => {
        const x = xOpen;
        const y = yString(string);
        const s = markerStyle(note.role);
        const key = `open-${string}`;
        const primary = showDegrees ? note.degree : note.name;
        const alternate = showDegrees ? note.name : note.degree;
        const label = hovered === key ? alternate : primary;
        return (
          <g
            key={key}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
          >
            <circle cx={x} cy={y} r={R} fill={s.fill} stroke={s.stroke}
              strokeOpacity={s.strokeOpacity} strokeWidth={1.5} />
            <text x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central"
              fontSize={11} fontWeight={s.weight} fill={s.text} fontFamily="monospace">
              {label}
            </text>
          </g>
        );
      })}

      {/* Fretted note markers */}
      {boardMarkers.map(({ string, fret, note }) => {
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

      {/* Window edge handles — grab either end to reframe the visible frets. */}
      {([
        { which: "from" as const, edgeX: PAD_X },
        { which: "to" as const, edgeX: PAD_X + cols * CELL_W },
      ]).map(({ which, edgeX }) => {
        const active = activeHandle === which;
        return (
          <g
            key={`handle-${which}`}
            style={{ cursor: "ew-resize", touchAction: "none" }}
            onPointerDown={onHandleDown(which)}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerEnter={() => !dragRef.current && setActiveHandle(which)}
            onPointerLeave={() => !dragRef.current && setActiveHandle(null)}
          >
            <rect
              x={edgeX - 10}
              y={boardTop - 10}
              width={20}
              height={boardBottom - boardTop + 20}
              fill="transparent"
            />
            <rect
              x={edgeX - 2}
              y={boardTop - 6}
              width={4}
              height={boardBottom - boardTop + 12}
              rx={2}
              fill={ACCENT}
              opacity={active ? 0.9 : 0.2}
            />
            {active && (
              <text
                x={edgeX}
                y={boardTop - 12}
                textAnchor="middle"
                fontSize={13}
                fill={ACCENT}
              >
                ↔
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
