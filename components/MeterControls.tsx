"use client";

/**
 * Meter controls (SPEC Step 3): beats-per-bar stepper + subdivision selector.
 */
import { usePlayback, BEATS_MIN, BEATS_MAX, type Subdivision } from "@/lib/store/playback";

const SUBDIVISIONS: { value: Subdivision; glyph: string; sup?: string; label: string }[] = [
  { value: 1, glyph: "♩", label: "Quarter notes" },
  { value: 2, glyph: "♫", label: "Eighth notes" },
  { value: 3, glyph: "♫", sup: "3", label: "Triplets" },
  { value: 4, glyph: "♬", label: "Sixteenth notes" },
];

export function MeterControls() {
  const beatsPerBar = usePlayback((s) => s.beatsPerBar);
  const setBeatsPerBar = usePlayback((s) => s.setBeatsPerBar);
  const subdivision = usePlayback((s) => s.subdivision);
  const setSubdivision = usePlayback((s) => s.setSubdivision);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Beats per bar */}
      <div className="flex items-center gap-4">
        <span className="text-xs uppercase tracking-wider text-foreground/50">Beats</span>
        <Round
          label="Fewer beats per bar"
          disabled={beatsPerBar <= BEATS_MIN}
          onClick={() => setBeatsPerBar(beatsPerBar - 1)}
        >
          −
        </Round>
        <span className="w-6 text-center font-mono text-xl tabular-nums">{beatsPerBar}</span>
        <Round
          label="More beats per bar"
          disabled={beatsPerBar >= BEATS_MAX}
          onClick={() => setBeatsPerBar(beatsPerBar + 1)}
        >
          +
        </Round>
      </div>

      {/* Subdivision */}
      <div className="flex items-center gap-2">
        {SUBDIVISIONS.map(({ value, glyph, sup, label }) => {
          const selected = subdivision === value;
          return (
            <button
              key={value}
              type="button"
              aria-label={label}
              aria-pressed={selected}
              onClick={() => setSubdivision(value)}
              className={`grid h-12 w-12 place-items-center rounded-md border text-2xl leading-none
                transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40
                ${selected
                  ? "border-transparent bg-[#ff5a3c] text-white"
                  : "border-foreground/15 bg-foreground/[0.03] text-foreground/70 hover:bg-foreground/[0.06]"}`}
            >
              <span className="relative">
                {glyph}
                {sup && <span className="absolute -right-2 -top-1 text-[10px] font-bold">{sup}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Round({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-full border border-foreground/15 text-lg
                 leading-none text-foreground/70 transition-colors hover:bg-foreground/[0.04]
                 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30
                 focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
    >
      {children}
    </button>
  );
}
