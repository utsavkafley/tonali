"use client";

/**
 * Chord chart — renders ChartData as a proper lead-sheet chart: systems (lines),
 * barlines, repeat-sign brackets, ×N labels, and a rep counter while playing.
 * Clicking a chord calls selectChord which drives both the fretboard and playback.
 */
import { useHarmony } from "@/lib/store/harmony";
import { chordLabel } from "@/lib/theory/scales";

export function ChordChart() {
  const chartData = useHarmony((s) => s.chartData);
  const playSteps = useHarmony((s) => s.playSteps);
  const currentPlayIndex = useHarmony((s) => s.currentPlayIndex);
  const selectChord = useHarmony((s) => s.selectChord);

  if (!chartData || chartData.systems.length === 0) return null;

  const current = playSteps[currentPlayIndex];

  return (
    <div className="flex flex-col gap-1.5">
      {chartData.systems.map((system, sIdx) =>
        system.map((section, secIdx) => {
          const isRepeat = section.repeat > 1;
          const isActive =
            current?.systemIdx === sIdx && current?.sectionIdx === secIdx;

          return (
            <div key={`${sIdx}-${secIdx}`} className="flex items-stretch justify-center">
              <RepeatSign side="start" show={isRepeat} />

              {section.bars.map((bar, bIdx) => (
                <div key={bIdx} className="flex items-stretch">
                  {bIdx > 0 && <Barline />}
                  <div className="flex w-24 flex-col items-stretch">
                    <div className="flex flex-1 items-center">
                      {bar.map((chord, cIdx) => {
                        const isSelected =
                          current?.systemIdx === sIdx &&
                          current?.sectionIdx === secIdx &&
                          current?.barInSection === bIdx &&
                          current?.chordInBar === cIdx;
                        return (
                          <button
                            key={cIdx}
                            onClick={() => selectChord(sIdx, secIdx, bIdx, cIdx)}
                            aria-pressed={isSelected}
                            className={`min-w-0 flex-1 rounded px-1 py-3 text-center text-lg
                              font-semibold tracking-tight transition-colors ${
                                isSelected
                                  ? "bg-[#ff5a3c]/15 text-foreground"
                                  : "text-foreground/80 hover:bg-foreground/[0.05]"
                              }`}
                          >
                            {chordLabel(chord)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}

              <RepeatSign side="end" show={isRepeat} count={section.repeat}>
                {/* Rep progress badge: shows e.g "2/3" while playing a repeat section */}
                {isRepeat && isActive && current && (
                  <span className="ml-1 font-mono text-xs text-[#ff5a3c]">
                    {current.repeatIdx + 1}/{section.repeat}
                  </span>
                )}
              </RepeatSign>
            </div>
          );
        }),
      )}
    </div>
  );
}

function Barline() {
  return <span className="w-px self-stretch bg-foreground/25" />;
}

function RepeatSign({
  side,
  show,
  count,
  children,
}: {
  side: "start" | "end";
  show: boolean;
  count?: number;
  children?: React.ReactNode;
}) {
  if (!show) {
    // Thin spacer barline to close each plain system
    return side === "end" ? (
      <span className="flex items-center gap-1 self-center px-1.5">
        <span className="h-8 w-px bg-foreground/25" />
        {children}
      </span>
    ) : (
      <span className="w-px self-stretch bg-foreground/25 mx-1.5" />
    );
  }

  const thick = <span className="w-1.5 self-stretch rounded-sm bg-foreground/60" />;
  const thin = <span className="w-px self-stretch bg-foreground/60" />;
  const dots = (
    <span className="flex flex-col justify-center gap-1.5 px-0.5">
      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
      <span className="h-1.5 w-1.5 rounded-full bg-foreground/60" />
    </span>
  );

  if (side === "start") {
    return (
      <span className="flex items-stretch gap-0.5 pr-1">
        {thick}
        {thin}
        {dots}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-0.5 pl-1">
      {dots}
      {thin}
      {thick}
      {count && count > 2 && (
        <span className="ml-1 self-center font-mono text-xs text-foreground/50">×{count}</span>
      )}
      {children}
    </span>
  );
}
