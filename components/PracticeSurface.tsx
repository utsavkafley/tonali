"use client";

/**
 * The single Practice Surface (Interaction Model). One cohesive screen of stacked layers
 * — Rhythm (timing), Fretboard (harmony), Texture (future). One full view at a time; the
 * others aren't shown but KEEP RUNNING (audio is decoupled from focus). Move between the
 * three steps with the prev/next arrows (1 Metronome → 2 Fretboard → 3 Texture). No tabs,
 * no routes, no swipe (it fights OS gestures).
 *
 * Audio lifecycle lives here (always mounted) so the metronome plays regardless of which
 * layer is focused.
 */
import { useEffect } from "react";
import {
  setBpm as setEngineBpm,
  setSwing as setEngineSwing,
  stopTransport,
} from "@/lib/audio/engine";
import { disposeMetronome } from "@/lib/audio/metronome";
import { usePlayback } from "@/lib/store/playback";
import { useSession, LAYERS, LAYER_META, type LayerId } from "@/lib/store/session";
import { Metronome } from "@/components/Metronome";
import { Fretboard } from "@/components/Fretboard";
import { FretboardControls } from "@/components/FretboardControls";

export function PracticeSurface() {
  const focus = useSession((s) => s.focus);
  const cycle = useSession((s) => s.cycle);

  // Audio lifecycle — mounted once, independent of focus (layers stay ON).
  useEffect(() => {
    const unsub = usePlayback.subscribe((s, prev) => {
      if (s.bpm !== prev.bpm) setEngineBpm(s.bpm);
      if (s.swing !== prev.swing) setEngineSwing(s.swing);
    });
    return () => {
      unsub();
      stopTransport();
      disposeMetronome();
    };
  }, []);

  const index = LAYERS.indexOf(focus);

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden p-8 pb-28">
      {/* Focused layer, center stage */}
      <div className="flex w-full max-w-4xl flex-col items-center">
        <FocusedLayer focus={focus} />
      </div>

      {/* Step pager (bottom center): prev / current / next */}
      <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-4
                      rounded-full border border-foreground/15 bg-background/80 px-3 py-2 backdrop-blur">
        <Arrow dir="prev" disabled={index <= 0} onClick={() => cycle(-1)} />
        <span className="min-w-[8.5rem] text-center text-sm font-medium tabular-nums">
          {index + 1} · {LAYER_META[focus].name}
        </span>
        <Arrow dir="next" disabled={index >= LAYERS.length - 1} onClick={() => cycle(1)} />
      </div>
    </main>
  );
}

function FocusedLayer({ focus }: { focus: LayerId }) {
  if (focus === "timing") return <Metronome />;
  if (focus === "harmony") {
    return (
      <div className="flex w-full flex-col items-center gap-8">
        <FretboardControls />
        <Fretboard />
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">Texture &amp; Instruments</h2>
      <p className="max-w-sm text-sm text-foreground/50">
        Bass, grand piano and ambient effects to lay over your groove and progression.
        Coming soon — it will layer on top of the rhythm and fretboard, all playing together.
      </p>
    </div>
  );
}

function Arrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "next" ? "Next step" : "Previous step"}
      className="grid h-9 w-9 place-items-center rounded-full border border-foreground/15
                 text-foreground/70 transition-colors hover:bg-foreground/[0.05]
                 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-25
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
    >
      {dir === "next" ? "›" : "‹"}
    </button>
  );
}
