"use client";

/**
 * Fretboard controls (Next Pillar §F): key + scale pickers and the slidable fret window
 * (from/to). The window lets you frame the frets you want and span 2–3 positions for
 * less-robotic improv, rather than staring at a fixed 0–22 board.
 */
import { useHarmony, FRET_MAX } from "@/lib/store/harmony";
import { ROOTS, SCALES, CHORD_TYPES, type ScaleId } from "@/lib/theory/scales";

const SELECT_CLASS =
  "rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40";

export function FretboardControls() {
  const {
    root,
    scale,
    fromFret,
    toFret,
    chordRoot,
    chordType,
    setRoot,
    setScale,
    setFretWindow,
    setChordRoot,
    setChordType,
  } = useHarmony();

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Key + scale */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Field label="Key">
          <select value={root} onChange={(e) => setRoot(e.target.value)} className={SELECT_CLASS}>
            {ROOTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Scale">
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as ScaleId)}
            className={SELECT_CLASS}
          >
            {SCALES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Chord — highlights chord tones over the scale (Slice 1) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Field label="Chord">
          <select
            value={chordRoot ?? "none"}
            onChange={(e) => setChordRoot(e.target.value === "none" ? null : e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="none">None</option>
            {ROOTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>

        <select
          value={chordType}
          onChange={(e) => setChordType(e.target.value)}
          disabled={chordRoot === null}
          aria-label="Chord quality"
          className={`${SELECT_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {CHORD_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fret window */}
      <div className="flex w-full max-w-md flex-col gap-2">
        <div className="flex items-center justify-between text-xs uppercase tracking-wider text-foreground/50">
          <span>Fret window</span>
          <span className="font-mono tabular-nums text-foreground/70">
            {fromFret} – {toFret}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-10 text-right font-mono text-xs text-foreground/40">from</span>
          <input
            type="range"
            min={0}
            max={FRET_MAX - 1}
            value={fromFret}
            onChange={(e) => setFretWindow(Number(e.target.value), toFret)}
            aria-label="First fret shown"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-foreground/15 accent-[#ff5a3c]"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="w-10 text-right font-mono text-xs text-foreground/40">to</span>
          <input
            type="range"
            min={1}
            max={FRET_MAX}
            value={toFret}
            onChange={(e) => setFretWindow(fromFret, Number(e.target.value))}
            aria-label="Last fret shown"
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-foreground/15 accent-[#ff5a3c]"
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-foreground/50">{label}</span>
      {children}
    </label>
  );
}
