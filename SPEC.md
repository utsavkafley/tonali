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

## Interaction Model — The Layered Practice Surface (north-star UX)

The app is **one cohesive surface**, not a set of tabs/tools. You build a living practice
session by **stacking layers bottom-up**, and each layer recedes (but keeps playing) as you
move to the next. No context switching, ever.

**The layers (bottom → top):**
1. **Foundation — Timing.** Metronome → drums → samples. Always the base.
2. **Harmony — Progression + Fretboard.** Set a progression, loop it, improvise scales/
   harmonies over it.
3. **Texture — Instrumentation.** Bass (synth), keys (grand piano), pads — makes it lively.

**Interaction rules:**
- **Focus + dock.** The layer you're shaping is center stage. Settled layers **minimize to
  a corner and KEEP RUNNING** (the metronome docks to the **top-left**, click still going).
- **Swipe up promotes** to the next layer (docking the current); **swipe down returns**.
  On desktop, an equivalent on-screen affordance + keyboard does the same.
- **Tap a docked layer to re-focus it.** Nothing is ever closed — only foregrounded or
  backgrounded.
- **The looper bridges layer 1 → 2:** once the progression's timing feels good, loop it as a
  hands-free backing, then improvise over it. This is what turns the foundation into a
  backing track.
- **The Practice/Theory drawer stays** as the cross-layer place to load presets (which can
  configure any layer) and read theory.

**Consequence:** no routes/tabs. The temporary Metronome/Fretboard nav (Step 6) is
transitional — the fretboard folds into the surface as the Harmony layer. State is already
layer-friendly (`playback` = timing, `harmony` = pitch compose); we add a focus/dock state
on top.

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

**Step 6 — Fretboard (theory pillar, first slice).** A `/fretboard` route renders a
static board for a chosen **key + scale** with **degree labels** (R / ♭3 / 5 / ♭7) over a
**slidable fret window** (from/to). Proves the pillar end to end: pure theory layer
(spelled notes + chroma + degree/role via Tonal.js) → harmonic-context store slice →
dumb SVG renderer. Right-handed, standard tuning (both params). Global nav added.
→ `lib/theory/{scales,fretboard}.ts`, `lib/store/harmony.ts`, `Fretboard.tsx`,
`FretboardControls.tsx`, `app/fretboard/page.tsx`, `app/layout.tsx`

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

## Next Pillar — Theory + Fretboard Engine (decisions frozen, not built)

The pitch/harmony half — the foundation under the fretboard, scale/chord highlighting,
chord charts, Quick Loop builder, per-chord scale mode, and song parsing. It lights up the
**Scales** and **Harmony** practice domains. Decisions locked before building (mirroring
the audio-engine decisions), so we don't retrofit:

- **A. Note model — spelled in context, matched by chroma.** Notes are *spelled* via the
  key/scale (Tonal.js) so accidentals and degrees read correctly (♯4 vs ♭5), but
  *compared* by pitch-class (0–11) for "is this fret in the scale?" Display = spelling,
  logic = chroma. (The harmony analog of audible-vs-notational.)
- **B. Theory layer vs render layer split.** A pure theory layer answers "given key +
  scale (+ chord later): which notes are active, each one's **degree** (R, ♭3, 5, ♭7) and
  **role** (root / chord-tone / scale-tone)?" The fretboard is a dumb SVG renderer fed
  `{string, fret, label, role}[]` — it never does theory. (Engine-vs-component, again.)
- **C. Harmonic-context store slice = the clock analog.** A slice (key, scale; current
  chord later) parallel to playback state, read reactively by the fretboard. Building it
  now means "fretboard updates as chords change during playback" is already wired.
  **It composes with playback** — scale practice runs the metronome underneath; a practice
  preset can set the fretboard, the metronome, or both.
- **D. Tuning, capo, handedness = parameters.** Standard tuning; **right-handed default**
  (left-handed is a flip); capo is a fret offset. Never hardcoded → alternate tunings/capo
  are parameter changes.
- **E. `chordScaleMode` behind one interface.** `notesForContext(ctx)` — ship song-mode
  (one scale) first; chord-mode (scale per chord — the theory heart) is a second
  implementation slotted in later, not a teardown.
- **F. Fretboard rendering.** SVG. **Slidable fret window** (from/to handles), *not* a
  fixed 0–22 — users frame the frets they want and can span **2–3 positions together** for
  less-robotic improv. **Degree labels by default** (note-name toggle later).
- **G. Hub integration.** Scales/Harmony domains preset the harmonic context (and optionally
  the metronome) via the `harmony?`/`scales?` config slots already in the `Practice` type —
  exactly parallel to Rhythm presets driving the metronome.

**First slice — DONE (Step 6).** Static fretboard, key + scale, degree labels, slidable
window, theory layer + harmonic-context slice + SVG renderer. **Next sub-steps:** wire the
**Scales practice domain** to preset the harmonic context (and optionally the metronome) →
chords → chord charts/highlighting → playback-driven context.

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
  See "Next Pillar — Theory + Fretboard Engine" for the frozen design decisions.
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

- **v15** — Locked the **Layered Practice Surface** interaction model: one surface, no
  tabs; stack timing → harmony → texture; focus + dock (settled layers minimize and keep
  running); swipe-up promotes; looper bridges timing → harmony. The Step-6 nav is
  transitional — fretboard folds into the surface as the Harmony layer.
- **v14** — Degree labels now use interval quality (Δ major, p perfect, ♭ minor/flat),
  e.g. `R Δ2 ♭3 p4 p5 Δ6 Δ7`, instead of bare numbers.
- **v13** — Built Step 6: the theory pillar's first slice. Added Tonal.js; pure theory
  layer (`lib/theory/`), harmonic-context store (`lib/store/harmony.ts`), SVG `Fretboard`
  + controls, `/fretboard` route, and global nav. Static key+scale with degree labels over
  a slidable fret window.
- **v12** — Froze the next-pillar (Theory + Fretboard) foundational decisions: spelled/
  chroma note model, theory/render split, harmonic-context slice (composes with the
  metronome — scale practice keeps time), tuning/capo/handedness params (left-handed
  default), chordScaleMode behind one interface, SVG fretboard with a slidable fret window
  + degree labels, hub integration via harmony/scales config slots.
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
