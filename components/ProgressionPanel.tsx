"use client";

/**
 * Progression panel (Chords pillar) — one component that both *shows* the progression as
 * a lead-sheet chart and *edits* it. The chart is primary; an "Edit as text" toggle
 * reveals the mini-syntax box in the same panel for fast bulk edits (two-way synced).
 * With no progression yet, the text editor is the way in, so it's shown by default.
 *
 * This replaces the old split where a textarea lived in FretboardControls and the chart
 * rendered separately below it.
 */
import { useState } from "react";
import { useHarmony } from "@/lib/store/harmony";
import { PROGRESSIONS, chartDataToText } from "@/lib/theory/progressions";
import { startProgressionClock, stopProgressionClock } from "@/lib/audio/progressionClock";
import {
  startMetronomeForProgression,
  stopMetronomeForProgression,
} from "@/lib/audio/metronomeController";
import { stopTransport } from "@/lib/audio/engine";
import { usePlayback } from "@/lib/store/playback";
import { ChordChart } from "@/components/ChordChart";
import { MicSync } from "@/components/MicSync";

const SELECT =
  "rounded-md border border-foreground/15 bg-background px-3 py-2 text-sm " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40";

export function ProgressionPanel() {
  const {
    chartData, progressionId, progressionPlaying,
    loadPreset, setProgressionText, clearProgression, setProgressionPlaying,
  } = useHarmony();

  const hasProg = chartData !== null;
  const [editing, setEditing] = useState(false);

  // Text draft buffer. The chart is the source of truth; whenever it changes externally
  // (preset load, key transpose, clearing) we re-seed the draft during render — the
  // documented "adjust state on prop change" pattern, no effect needed.
  const chartText = chartData ? chartDataToText(chartData) : "";
  const [draft, setDraft] = useState(chartText);
  const [syncedText, setSyncedText] = useState(chartText);
  if (chartText !== syncedText) {
    setSyncedText(chartText);
    setDraft(chartText);
  }

  // No progression yet → the text editor is the only entry point, so keep it open.
  const showEditor = editing || !hasProg;

  async function togglePlay() {
    if (progressionPlaying) {
      stopProgressionClock();
      stopMetronomeForProgression(); // stop the click track only if Play started it
      if (!usePlayback.getState().playing) stopTransport(); // keep clock if metronome rides it
      setProgressionPlaying(false);
    } else {
      await startProgressionClock();
      await startMetronomeForProgression(); // Play also gives an audible click track
      setProgressionPlaying(true);
    }
  }

  function commitDraft(text: string) {
    if (text.trim()) setProgressionText(text);
    else clearProgression();
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-3 rounded-xl border border-foreground/10
                    bg-foreground/[0.015] p-4">
      {/* Header: preset picker · play · edit toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-foreground/50">Progression</span>
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
            {progressionId === "custom" && <option value="custom" disabled>Custom</option>}
          </select>
        </label>

        {hasProg && (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                  progressionPlaying
                    ? "border-[#ff5a3c] bg-[#ff5a3c]/10 text-[#ff5a3c] hover:bg-[#ff5a3c]/20"
                    : "border-foreground/20 text-foreground/70 hover:bg-foreground/[0.05]"
                }`}
            >
              {progressionPlaying ? "Stop" : "Play"}
            </button>
            <MicSync />
            <button
              onClick={() => setEditing((e) => !e)}
              aria-pressed={editing}
              className={`rounded-md border px-3 py-2 text-sm transition-colors
                focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 ${
                  editing
                    ? "border-foreground/40 bg-foreground/[0.06] text-foreground"
                    : "border-foreground/15 text-foreground/60 hover:bg-foreground/[0.05]"
                }`}
            >
              Edit as text
            </button>
          </div>
        )}
      </div>

      {/* Chart (the primary, always-visible view once a progression exists) */}
      {hasProg && <ChordChart />}

      {/* Text editor — inline when toggled, or the entry point when there's no chart yet */}
      {showEditor && (
        <div className="flex flex-col gap-1">
          {hasProg && <div className="h-px w-full bg-foreground/10" />}
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
      )}
    </div>
  );
}
