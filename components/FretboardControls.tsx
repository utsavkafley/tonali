"use client";

/**
 * Fretboard controls: key, scale, preset picker, and a textarea for the progression
 * mini-syntax. A play/stop button fires the progression clock.
 */
import { useEffect, useState } from "react";
import { useHarmony } from "@/lib/store/harmony";
import { ROOTS, SCALES, CHORD_TYPES, type ScaleId } from "@/lib/theory/scales";
import { PROGRESSIONS, chartDataToText } from "@/lib/theory/progressions";
import { startProgressionClock, stopProgressionClock } from "@/lib/audio/progressionClock";
import { stopTransport } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/store/playback";

const SELECT =
  "rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40";

export function FretboardControls() {
  const {
    root, scale, chordRoot, chordType,
    chartData, progressionId, progressionPlaying,
    setRoot, setScale, setChordRoot, setChordType,
    loadPreset, setProgressionText, clearProgression, setProgressionPlaying,
  } = useHarmony();

  const hasProg = chartData !== null;

  // Textarea draft: synced from store when chart changes externally (preset load / key change)
  const [draft, setDraft] = useState(() => (chartData ? chartDataToText(chartData) : ""));
  useEffect(() => {
    setDraft(chartData ? chartDataToText(chartData) : "");
  }, [chartData]);

  async function togglePlay() {
    if (progressionPlaying) {
      stopProgressionClock();
      // Only stop transport if metronome is also not playing
      if (!usePlayback.getState().playing) stopTransport();
      setProgressionPlaying(false);
    } else {
      await startProgressionClock();
      setProgressionPlaying(true);
    }
  }

  function commitDraft(text: string) {
    if (text.trim()) setProgressionText(text);
    else clearProgression();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Key + scale + preset row */}
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

        <Field label="Progression">
          <select
            value={progressionId ?? "none"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "none") { clearProgression(); return; }
              const preset = PROGRESSIONS.find((p) => p.id === v);
              if (preset) loadPreset(preset);
            }}
            className={SELECT}
          >
            <option value="none">None</option>
            {PROGRESSIONS.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
            {progressionId === "custom" && (
              <option value="custom" disabled>Custom</option>
            )}
          </select>
        </Field>
      </div>

      {/* Textarea: mini-syntax input */}
      <div className="flex w-full max-w-md flex-col gap-1">
        <textarea
          value={draft}
          rows={Math.max(2, (draft.match(/\n/g)?.length ?? 0) + 2)}
          placeholder={"A7 | D7 | A7 | E7\nD7 | D7 | A7 | A7\n|: E7 | D7 | A7 | E7 :|×2"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              commitDraft(draft);
              e.currentTarget.blur();
            }
          }}
          className={`${SELECT} w-full resize-none font-mono text-sm leading-relaxed`}
          aria-label="Chord progression"
          spellCheck={false}
        />
        <p className="text-center text-[11px] text-foreground/40">
          newline = new line · <code className="text-foreground/55">|</code> = barline ·{" "}
          <code className="text-foreground/55">|: … :|×2</code> = repeat · ⌘↵ to apply
        </p>
      </div>

      {/* Play / stop progression */}
      {hasProg && (
        <button
          onClick={togglePlay}
          className={`rounded-full border px-6 py-2 text-sm font-medium transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
              progressionPlaying
                ? "border-[#ff5a3c] bg-[#ff5a3c]/10 text-[#ff5a3c] hover:bg-[#ff5a3c]/20"
                : "border-foreground/20 text-foreground/70 hover:bg-foreground/[0.05]"
            }`}
        >
          {progressionPlaying ? "Stop Progression" : "Play Progression"}
        </button>
      )}

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
