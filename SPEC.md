# Tonali — SPEC (Living Document)

> **Status:** Foundation phase. One feature at a time, on a robust audio engine, with
> sound quality as a first-class concern. Each change is discussed before the next.

---

## North Star

A web app that helps a guitarist practice improvising over chord progressions.
Eventually: paste or build a progression, hit play, and jam over a real-feeling backing
track (metronome + grooving drums + comped harmony) while a fretboard highlights the
notes that work over the current chord. The **Backlog** is that destination; we build
toward it one step at a time.

---

## Build Philosophy

1. **Audio engine before features** — every visual feature is a thin layer over a solid
   timing/sound core.
2. **Sound quality is not "later"** — a dead metronome or cheap drums kill motivation.
3. **One feature at a time, discussed** — ship small and real, then talk.
4. **Design for what's coming** — the clock already anticipates swing, sub-beat
   scheduling, time signatures, and harmony, so we don't retrofit a naive core.

---

## Audio Engine — Foundational Decisions (expensive to change later)

- **A. Autoplay unlock.** `Tone.start()` only ever runs inside a user gesture; an
  app-wide `audioReady` gate guards all scheduling. (First gesture = big button or a pad.)
- **B. Singleton lifecycle.** Tone Transport is global; one idempotent module
  (`lib/audio/engine.ts`) owns it. Components call engine methods, never Tone directly.
  Schedules are tracked and cleared on cleanup — StrictMode-safe, no ghost clicks.
- **C. Music-aware clock.** Time signature is a real parameter; `Transport.swing` is
  wired (default 0); scheduling uses musical time + tick math so sub-beat events and
  meter changes slot in cleanly.
- **D. Swappable sound + sample pipeline.** Sound sources sit behind the engine (the
  click can later be a drum sample). An async sample-loading path is anticipated so real
  drum/instrument samples don't force a restructure.

## Sound Sourcing Strategy (standing decision)

Matched per instrument, not one-size-fits-all:

- **Samples** for acoustic/realistic instruments (drums, percussion, keys, guitar
  comping) — the biggest sound-quality lever. Quality tiers added as needed: single →
  velocity layers → round-robin → multi-sample across pitch.
- **Synthesis** for actual synth voices (pads, leads, synth bass) and the metronome click.
- **Anti-pattern we avoid:** Tone.js synthesis faking acoustic instruments
  (`MembraneSynth` as a kick) — the source of its "cheap" reputation.

---

## Tech Stack

Next.js (App Router) + React + TypeScript · **Tone.js** (audio) · **Zustand** (state) ·
Tailwind CSS · deploy on Vercel.

*(Tonal.js, Supabase, and the LLM chord-sheet parser are North-Star items — not yet
dependencies.)*

---

## Shipped

**Step 1 — Metronome.** Big clickable circle owns start/stop (and first-gesture audio
unlock). Live BPM via editable readout + −10/+10 steppers + slider. Visual pulse driven
by `Tone.Draw`, locked to audio.
→ `engine.ts`, `metronome.ts`, `store/playback.ts`, `Metronome.tsx`, `BpmControl.tsx`

**Step 2 — Tap Pads.** Compact 2×2, top-right, unlabelled. Any pad feeds one tap-tempo
detector: rolling avg of last ~5 intervals, outlier rejection, >2s gap resets, <250ms
debounced. Pads only set BPM (never start/stop); each flashes on hit.
*Dual-purpose by design* — the same pads become **drum-sample triggers** later (per-pad
`voice` slot already stubbed).
→ `useTapTempo.ts`, `PadGrid.tsx`

**Step 3 — Meter, stress & subdivision.** Interactive beat row = current-beat indicator
**and** click-to-stress editor. Beats-per-bar stepper (accent map resizes). Subdivision
selector (quarter/eighth/triplet/sixteenth). Click voice has 3 levels (stressed / normal
/ soft subdivision). All apply **live with no reschedule**: clicks run on a fixed
12-ticks/beat grid that contains every subdivision; each feel just gates which grid ticks
fire (this is what fixed the mid-play switch glitch).
→ `store/playback.ts`, `metronome.ts`, `BeatRow.tsx`, `MeterControls.tsx`, `Metronome.tsx`

**Step 4 — Theory + Practice hub.** Left expanding drawer. Top level = practice
**domains** (Rhythm live; Harmony/Scales are "coming soon" stubs that will drive the
fretboard/chords). Data-driven: a `Practice` carries a domain config (`rhythm`) + blurb +
tip; selecting one calls `applyPreset` (sets bpm/beats/subdivision/accents atomically) and
shows its theory. `activePracticeId` highlights it; any manual edit de-highlights. Locked
practices shown as teasers. A "Learn" section holds reference theory.
→ `lib/practice/{types,rhythm,index}.ts`, `store/playback.ts`, `PracticePanel.tsx`

**Step 5 — Muted beats & swing.** Beat cells now cycle normal → stressed → **muted**
(silent; the indicator still passes over them — gap-click). A **swing** slider (0–100%)
shifts the off-beats via `Transport.swing`. This unlocked the Shuffle and Gap-Click
practices. *Scheduler change:* because swing nudges the callback `time` later without
moving the tick source, the scheduler now tracks grid position with a **step counter**
(swing-immune) instead of inverting `time`→ticks. Tempo & swing reach the engine via one
store→engine subscription (in `Metronome`), covering manual edits, tap tempo and presets.
→ `store/playback.ts`, `engine.ts`, `metronome.ts`, `BeatRow.tsx`, `MeterControls.tsx`, `rhythm.ts`

---

## Standing Notes (decided, not all built)

**Pad mode separation (ships WITH drums, not before).** Once pads make sound, drumming
must not nudge BPM. A small **"Tap BPM" toggle** switches pads to tempo mode (highlighted);
**auto-reverts** to drum mode after the >2s gap. The toggle only routes a hit to `tap()`
vs the sampler — `useTapTempo` is unchanged. Not built now (would be dead UI with one mode).

**Time signature model.** Top number = our Beats stepper. Bottom number = the note value
of one unit — *not exposed*, because it's a notation convention, not audible (N clicks/bar
sound identical regardless). Compound feel is reproduced with our tools, e.g.
**6/8 = Beats 2 + triplet + stress 1**. A future denominator picker would be display/preset
only.

---

## Backlog (the roadmap — pulled one item at a time)

**Rhythm-trainer mechanics (remaining):**
- **Subdivision-level accents** — accent the "and"/off-beats, not just whole beats.
  Unlocks the still-locked Clave / Off-beats practice (reggae/Latin feels). Needs the
  click grid to carry an accent map at subdivision resolution.
  *(Muted beats and swing — done in Step 5.)*

**Toward the North Star:**
- Drum engine: real samples + genre patterns (shuffle, rock, funk, jazz, bossa). Bundles
  the pad "Tap BPM" toggle (see Standing Notes).
- Chord/harmony playback (comped chords to jam over) — the biggest "tool → experience" jump.
- Bar grid / chord chart (start with a hardcoded 12-bar blues).
- Static fretboard (key + scale) → chord-tone highlighting synced to the current bar.
- Quick Loop builder (key + scale + progression template + BPM).
- Sub-bar (beat-level) chord changes.
- Per-chord scale mode (Dorian over iim7, Mixolydian over V7…) — the theory heart; why a
  single-key model teaches wrong notes over dominants.
- LLM chord-sheet parser → structured song; song view (chords over lyrics); section
  looping; Supabase library.
- Alternate tunings, capo, fretboard position selector.
- Other time signatures (denominator picker = display/preset only; accent-grouping presets).

These also map to future **Practice hub** domains (Harmony, Scales) that will preset the
fretboard/chords and show key/scale/chord-tone theory.

---

## Changelog

- **v11** — Built Step 5 (muted beats + swing). Beat cells cycle normal/stress/mute;
  swing slider via `Transport.swing`. Unlocked Shuffle + Gap-Click practices. Scheduler
  moved to a swing-immune step counter; centralized tempo/swing → engine via a store
  subscription.
- **v10** — Trimmed the doc: collapsed built Steps 1–4 into a compact "Shipped" summary,
  consolidated standing notes, condensed backlog + changelog.
- **v9** — Built Step 4 (Theory + Practice hub; domains, data-driven practices, applyPreset).
- **v8** — Defined Step 4; added rhythm-trainer backlog (muted beats, sub-accents, swing).
- **v7** — Time-signature model standing note (denominator is display-only).
- **v6** — Built Step 3 (meter/stress/subdivision); fixed subdivision-switch glitch via
  fixed-grid gating (no reschedule).
- **v5** — Decided pad mode separation (Tap BPM toggle, auto-revert) — ships with drums.
- **v4** — Defined Step 2 (Tap Pads); moved tap tempo off the big circle.
- **v3** — Built Step 1; scaffolded Next.js + Tone.js + Zustand; added Sound Sourcing strategy.
- **v2** — Foundation-first rewrite: audio-engine decisions, Step 1 scoped, vision → backlog.
- **v1** — Original full-app spec (now the North Star).
