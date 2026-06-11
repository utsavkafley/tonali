"use client";

/**
 * Fretboard controls: key, scale, and a standalone-chord picker (shown only when no
 * progression is loaded). The progression itself — preset, chart, text editor, play —
 * lives in its own unified ProgressionPanel.
 */
import { useHarmony } from "@/lib/store/harmony";
import { ROOTS, SCALES, CHORD_TYPES, type ScaleId } from "@/lib/theory/scales";

const SELECT =
  "rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40";

export function FretboardControls() {
  const {
    root, scale, chordRoot, chordType, chartData,
    setRoot, setScale, setChordRoot, setChordType,
  } = useHarmony();

  const hasProg = chartData !== null;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Key + scale row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Field label="Key">
          <select value={root} onChange={(e) => setRoot(e.target.value)} className={SELECT}>
            {ROOTS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>

        <Field label="Scale">
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value as ScaleId)}
            className={SELECT}
          >
            {SCALES.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Standalone chord (only shown with no progression) */}
      {!hasProg && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Field label="Chord">
            <select
              value={chordRoot ?? "none"}
              onChange={(e) => setChordRoot(e.target.value === "none" ? null : e.target.value)}
              className={SELECT}
            >
              <option value="none">None</option>
              {ROOTS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <select
            value={chordType}
            onChange={(e) => setChordType(e.target.value)}
            disabled={chordRoot === null}
            aria-label="Chord quality"
            className={`${SELECT} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {CHORD_TYPES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      )}
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
