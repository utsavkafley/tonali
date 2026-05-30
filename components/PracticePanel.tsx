"use client";

/**
 * Theory + Practice hub (SPEC Step 4). A left expanding panel of practice domains.
 * Rhythm presets the metronome and teaches the "why"; Harmony/Scales are coming-soon
 * stubs. Selecting a practice applies its preset and reveals its blurb + tip.
 */
import { useState } from "react";
import { domains } from "@/lib/practice";
import { REQUIREMENT_LABEL, type DomainId, type Practice } from "@/lib/practice/types";
import { usePlayback } from "@/lib/store/playback";
import { useSession, type LayerId } from "@/lib/store/session";

/** The drawer follows the focused layer: it shows that layer's domain. */
const DOMAIN_FOR_LAYER: Record<LayerId, DomainId> = {
  timing: "rhythm",
  harmony: "scales",
  texture: "harmony",
};

export function PracticePanel() {
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const focus = useSession((s) => s.focus);
  const domainId = DOMAIN_FOR_LAYER[focus];

  const activeId = usePlayback((s) => s.activePracticeId);
  const applyPreset = usePlayback((s) => s.applyPreset);

  const domain = domains.find((d) => d.id === domainId)!;
  const groups = [...new Set(domain.practices.map((p) => p.group))];

  function onPick(p: Practice) {
    setOpenId((id) => (id === p.id ? null : p.id));
    if (!p.requires && p.rhythm) applyPreset(p.id, p.rhythm);
  }

  return (
    <>
      {/* Edge toggle — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close practice panel" : "Open practice panel"}
        aria-expanded={open}
        className="fixed left-0 top-24 z-30 rounded-r-md border border-l-0 border-foreground/15
                   bg-background px-2 py-4 text-[1.2rem] font-medium tracking-widest
                   text-foreground/70 [writing-mode:vertical-rl] transition-colors
                   hover:bg-foreground/[0.04] hover:text-foreground"
      >
        PRACTICE
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[1px]"
          aria-hidden
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[468px] max-w-[88vw] flex-col
                    border-r border-foreground/15 bg-background transition-transform
                    duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <header className="flex items-center justify-between border-b border-foreground/10 px-5 py-4">
          <div>
            <h2 className="text-[1.2rem] font-semibold tracking-tight">{domain.name}</h2>
            <p className="text-[1.1rem] text-foreground/50">
              Practice &amp; theory for the layer you&apos;re on.
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full text-foreground/50
                       hover:bg-foreground/[0.06] hover:text-foreground"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-4 text-[1rem] leading-relaxed text-foreground/60">
            {domain.blurb}
          </p>

          {!domain.available ? (
            <div className="rounded-lg border border-dashed border-foreground/20 p-6 text-center">
              <p className="text-[1.2rem] font-medium">Coming soon</p>
              <p className="mt-1 text-[1rem] text-foreground/50">
                This domain will preset the fretboard &amp; chords and show key,
                scale and chord-tone theory.
              </p>
            </div>
          ) : (
            <>
              {groups.map((group) => (
                <section key={group} className="mb-5">
                  <h3 className="mb-2 text-[0.9rem] font-semibold uppercase tracking-wider text-foreground/40">
                    {group === "Locked" ? "Coming with new mechanics" : group}
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {domain.practices
                      .filter((p) => p.group === group)
                      .map((p) => {
                        const locked = !!p.requires;
                        const isActive = activeId === p.id;
                        const isOpen = openId === p.id;
                        return (
                          <li key={p.id}>
                            <button
                              onClick={() => onPick(p)}
                              className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                                isActive
                                  ? "border-foreground/40 bg-foreground/10"
                                  : "border-foreground/10 hover:bg-foreground/[0.04]"
                              } ${locked ? "opacity-60" : ""}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[1.2rem] font-medium">
                                  {p.name}
                                </span>
                                {locked ? (
                                  <span className="shrink-0 rounded bg-foreground/10 px-1.5 py-0.5 text-base text-foreground/50">
                                    needs {REQUIREMENT_LABEL[p.requires!]}
                                  </span>
                                ) : isActive ? (
                                  <span className="shrink-0 text-base font-medium text-foreground/50">
                                    active
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-[1rem] text-foreground/50">
                                {p.trains}
                              </p>

                              {isOpen && (
                                <div className="mt-2 border-t border-foreground/10 pt-2">
                                  <p className="text-[1rem] leading-relaxed text-foreground/70">
                                    {p.blurb}
                                  </p>
                                  <p className="mt-1.5 text-[1rem] leading-relaxed text-foreground/55">
                                    <span className="font-medium text-foreground/70">
                                      Tip:{" "}
                                    </span>
                                    {p.tip}
                                  </p>
                                </div>
                              )}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}

              {/* Theory reference */}
              {domain.theory.length > 0 && (
                <section className="mt-6 border-t border-foreground/10 pt-4">
                  <h3 className="mb-2 text-[0.9rem] font-semibold uppercase tracking-wider text-foreground/40">
                    Learn
                  </h3>
                  <div className="flex flex-col gap-1">
                    {domain.theory.map((t) => (
                      <details
                        key={t.heading}
                        className="group rounded-md px-1"
                      >
                        <summary className="cursor-pointer list-none py-1.5 text-[1.2rem] font-medium text-foreground/80 marker:content-none hover:text-foreground">
                          <span className="mr-1 inline-block text-foreground/40 transition-transform group-open:rotate-90">
                            ›
                          </span>
                          {t.heading}
                        </summary>
                        <p className="px-4 pb-2 text-[1rem] leading-relaxed text-foreground/60">
                          {t.body}
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
