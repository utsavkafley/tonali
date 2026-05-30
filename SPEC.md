# Tonali — SPEC (Living Document)

> **Status:** Foundation phase. We build one feature at a time, on top of a robust
> audio engine, with sound quality as a first-class concern from day one.
> This document evolves as we build. Each change is discussed before the next.

---

## North Star (the long-term vision)

A web app that helps a guitarist practice improvising over chord progressions.
Eventually: paste or build a chord progression, hit play, and jam over a real-feeling
backing track (metronome + grooving drums + comped harmony) while a fretboard
highlights the notes that work over the currently-playing chord.

We are **not** building that today. We are building the foundation it will stand on.
Everything below the "Current Build" line is the destination, not the next step.

---

## Build Philosophy

1. **Audio engine before features.** Every visual feature is a thin layer over a
   solid timing/sound core. We get the clock right first.
2. **Sound quality is not "later."** A dead-feeling metronome or bad drums kill
   motivation to practice. We design for groove, good samples, and musicality
   from the foundation up — even when the first feature is simple.
3. **One feature at a time, discussed.** We ship a small, real, working thing,
   then talk before adding the next. This document is updated at each step.
4. **Design for what's coming.** The metronome is simple, but the engine under it
   must already anticipate swing, sub-beat scheduling, time signatures, and
   harmony playback — because retrofitting those into a naive clock is painful.

---

## Audio Engine — Foundational Design Decisions

These decisions are made **now**, before writing feature code, because they are
expensive to change later. They directly address the known pitfalls.

### A. AudioContext unlock (autoplay policy)
Browsers block all audio until a user gesture. `Tone.start()` must run inside a
real click handler — never on mount.

- A single, app-wide "audio ready" gate. The first user gesture (e.g. the big
  metronome button itself) calls `Tone.start()` and flips an `audioReady` flag.
- No audio module schedules or plays anything before `audioReady` is true.
- UI reflects the locked state honestly (button shows it will start audio).

### B. Tone.js singleton lifecycle in Next.js App Router
The Tone Transport is a global singleton. App Router + React StrictMode double-invoke
effects in dev, and navigation remounts components — both cause doubled clicks,
ghost schedules, or a dead Transport.

- The audio engine lives in **one module** (`lib/audio/engine.ts`) that owns init,
  exposes typed methods, and is idempotent: calling init twice is safe.
- Components never touch Tone directly. They call engine methods.
- All schedules are tracked so they can be cleared on cleanup; we never leak
  `scheduleRepeat` ids.
- `"use client"` boundaries are explicit; the engine is client-only.

### C. The clock is built for music, not just beats
Even though step 1 only needs a click on each beat, the transport is configured
from the start to support:

- **Time signature** as a real parameter (`Transport.timeSignature`), not hard-coded 4/4.
- **Swing** (`Transport.swing` + `swingSubdivision`) wired in now, default 0, so a
  groove slider later is a parameter change, not a rewrite.
- **Sub-beat scheduling** via Tone's musical time notation (`"4n"`, `"8n"`, bars:beats:sixteenths),
  so future half-bar chord changes and drum subdivisions slot in cleanly.
- Scheduling uses **`Tone.Part`/`Tone.Sequence`** abstractions where patterns repeat,
  rather than raw `scheduleRepeat`, so loop points and cancellation stay clean.

### D. Sound source quality
- The metronome click should sound good and tight, with a clear accent on beat 1.
  We start with a crisp short synth click but isolate the sound source behind the
  engine so it can be swapped for a sample without touching callers.
- **Planned:** once the drum sampler lands, the metronome click can be driven by a
  drum sample (e.g. a rimshot / hi-hat / click stick) instead of the synth tick —
  same scheduling, different sound source. The metronome module is designed for this
  swap from day one.
- A **sample-loading pipeline** (async `AudioBuffer` load, ready-state, hosting) is
  anticipated in the engine design so adding real drum/instrument samples later
  doesn't require restructuring.

## Sound Sourcing Strategy (standing decision)

How we make it sound genuinely good — matched per instrument, not one-size-fits-all.

- **Samples** for realistic/acoustic instruments: **drums, percussion, keys (piano,
  Rhodes, organ), guitar comping.** Real recordings are the biggest sound-quality
  lever; synthesis can't convincingly fake them. Sourced from good free/paid packs,
  loaded via the sample pipeline.
- **Synthesis** (Tone.js oscillators/filters/envelopes) for actual synth voices
  (pads, leads, synth bass) and the metronome click. Tone.js shines here because
  there is no acoustic original to fall short of.
- **Quality tiers within sampling**, added incrementally as needed: single sample →
  velocity layers → round-robin (avoid the "machine-gun" repeat) → multi-sample
  across pitch. The engine must allow adding these layers without restructuring.
- The known anti-pattern we explicitly avoid: using Tone.js *synthesis* to fake
  *acoustic* instruments (e.g. `MembraneSynth` as a kick). That is the source of
  Tone.js's "sounds cheap" reputation; we sidestep it by sampling those instruments.

---

## Tech Stack

- **Framework:** Next.js (App Router) + React + TypeScript
- **Audio:** Tone.js — transport, scheduling, synths/samplers
- **State:** Zustand for playback/UI state
- **Styling:** Tailwind CSS
- **Deployment:** Vercel

(Music theory via Tonal.js, Supabase persistence, and the LLM chord-sheet parser
are part of the North Star but are **not** in scope yet and not yet dependencies.)

---

# ═══════════════ CURRENT BUILD ═══════════════

## Step 1 — The Metronome ✅ done

A large, clickable metronome with a BPM slider, sitting on the foundational audio
engine described above. This is the whole feature. Everything else waits.

### What the user sees and does
- A big, prominent, clickable metronome control — the visual centerpiece.
- Tapping it the first time unlocks audio (satisfies autoplay policy) and starts
  the click. Tapping again stops it. The big circle owns start/stop only — tempo
  input lives in the pads (Step 2), keeping this control single-purpose and clean.
- An editable numeric BPM readout flanked by −10 / +10 steppers, plus a fine slider.
  All change tempo live while playing.
- A visual beat indicator that pulses in sync with the audio click.
- An accent on beat 1 (audible and visual), assuming 4/4 for now.

### Behavior
- BPM range: a sensible practice range (e.g. 40–240), default 100.
- BPM changes apply immediately, mid-playback, without restarting the transport.
- Visual pulse is driven by the same scheduled audio events (via `Tone.Draw`),
  so sight and sound stay locked together — no separate visual timer.
- 4/4 only for now, but the engine knows it's 4/4 (not hard-coded), so other
  time signatures are a later parameter change.

### Files this step touches
```
lib/audio/engine.ts      // singleton: init, Tone.start gate, transport config
lib/audio/metronome.ts   // click sound source + beat scheduling, accent on 1
lib/store/playback.ts    // Zustand: playing, bpm, currentBeat, audioReady
components/Metronome.tsx  // the big clickable control + beat pulse
components/BpmControl.tsx // slider + numeric readout
app/page.tsx             // mounts the metronome
```

### Done when
- Click sounds tight and good, accent on beat 1 is clearly audible.
- BPM slider changes tempo live with no glitch or restart.
- Visual pulse is dead-on with the audio.
- No doubled clicks or ghost audio in dev (StrictMode-safe).
- Audio only starts after a user gesture; never errors on load.

---

## Step 2 — Tap Pads (current)

A compact **2×2 grid of pads**, tucked in the **top-right** corner, unlabelled.

### Why they exist (their purpose)
The pads are a deliberately dual-purpose surface, designed once and used twice:

1. **Now — tap tempo.** The user listens to a song and taps any pad in time; the
   app derives the BPM from the tap rhythm. This is the canonical, real-world way a
   musician answers "what tempo is this?" so they can practice at it. Splitting tap
   tempo onto its own surface keeps the big metronome circle single-purpose
   (start/stop) — no overloaded gestures, no modes, no long-press.
2. **Later — drum pads.** These same pads become **drum-sample triggers** you tap to
   make sounds (see Sound Sourcing Strategy → samples for drums). The component is
   built with a per-pad *voice slot* from day one, so attaching a sampler to each pad
   is an upgrade, not a rewrite. The flash-on-hit feedback already pre-figures the
   drum-pad feel.

### Mode separation (ships WITH the drums, not before)
Once pads make drum sounds, drumming freely must not nudge the BPM. So:

- **Default: drum mode.** A pad hit plays its sample; no tempo side-effect.
- **"Tap BPM" toggle** — a small control near the pads. Flip it on and the pads
  switch to tempo mode (visibly highlighted so the mode is unmistakable); hits set
  BPM via the existing `useTapTempo` hook and make no drum sound.
- **Auto-revert (decided).** After the tempo settles — the same >2s "fresh
  measurement" gap the detector already uses — the toggle flips back to drum mode on
  its own. The user is never stranded in tempo mode; no manual toggle-off needed.
- Implementation seam: the toggle only gates whether a pad hit routes to `tap()` or
  to the sampler. `useTapTempo` is unchanged. **Not built yet** — there is only one
  mode (tempo) until samples exist, so building the toggle now would be dead UI.

### Behavior (tap tempo)
- **Any pad** registers a tap; all four feed one shared tempo detector — drum across
  them or hammer one, it doesn't matter.
- BPM = 60000 / (rolling average of the last ~5 inter-tap intervals), with **outlier
  rejection** (an interval wildly off the running median is discarded as a misfire).
- A gap **> 2s** since the last tap **resets** to a fresh measurement.
- Taps faster than 240 BPM (< 250ms apart) are debounced as accidental double-fires.
- The BPM readout updates **live** as taps converge, so the user sees it lock in and
  stops when it feels right — no fixed tap count required.
- Pads **only set BPM**; they never start/stop playback. The big circle owns that.
- Each pad **flashes** on hit (immediate feedback; previews the future drum feel).
- A pad press also unlocks audio (it's a valid user gesture), so the engine is ready.

### Files this step touches
```
lib/audio/useTapTempo.ts // rolling-average tap-tempo hook (timing math, sets BPM)
components/PadGrid.tsx    // the 2×2 grid + Pad (per-pad voice slot stubbed for drums)
app/page.tsx             // mounts PadGrid in the top-right corner
```

### Done when
- Tapping any pad in time to a song converges on the correct BPM, shown live.
- Outliers and stray double-taps don't yank the tempo; a long gap starts fresh.
- Pads visibly flash on hit and never start/stop the metronome.
- Component structure leaves a clean seam to attach drum samples per pad later.

---

## Step 3 — Metronome: meter, stress & subdivision ✅ done

Expands the metronome with a control row below it: choose how many beats per bar,
stress specific beat(s), and subdivide the beat — while seeing which beat is playing.

### What the user sees and does
- **Interactive beat row** (replaces the plain beat dots). One cell per beat; the
  cell does double duty:
  - **Indicator** — the currently-playing beat highlights as the transport advances.
  - **Stress editor** — click any cell to toggle its accent on/off. Stress one beat,
    two, or however many; accented cells get the filled/orange look.
- **Beats-per-bar stepper** (`− N +`) — set the number of beats per bar (3, 4, 5, 6…).
  The accent map resizes to match (beat 1 stays stressed by default).
- **Subdivision selector** — quarter / eighth / triplet / sixteenth. Picking one
  changes how each beat is chopped up; the in-between clicks play softer.

### Behavior
- The click now has **three levels**: **stressed** beat, **normal** beat, and a
  quieter **subdivision** click. (A future **muted** beat is an easy 4th level — the
  accent map generalizes to it; not built now.)
- Stress, beats-per-bar **and subdivision** all apply **live** (read per tick) with
  no reschedule. Clicks are scheduled on a fine fixed grid (12 ticks/beat, which
  evenly contains quarter/eighth/triplet/sixteenth); each subdivision just gates which
  grid ticks click. No rescheduling means no mid-play glitch when switching feels.
  Beat detection is derived from absolute transport ticks, not a counter.
- Default: 4 beats, beat 1 stressed, quarter-note subdivision (i.e. today's behavior).
- Swing/shuffle subdivision is intentionally deferred to the musical-expansion work
  (it ties into the `Transport.swing` we already wired). Step 3 ships the plain set.

### Files this step touches
```
lib/store/playback.ts    // beatsPerBar (mutable), accents[], subdivision + setters
lib/audio/metronome.ts   // 3-level click voice; subdivision-aware tick scheduling
components/BeatRow.tsx    // interactive beat cells: indicator + stress toggle
components/MeterControls.tsx // beats-per-bar stepper + subdivision selector
components/Metronome.tsx  // wires the new row; reschedules on subdivision change
```

### Done when
- Clicking beat cells toggles their accent and you hear the stress shift live.
- The beats-per-bar stepper changes the meter and the row resizes correctly.
- Each subdivision (1/2/3/4 per beat) clicks at the right rate with softer in-betweens
  and stays aligned to the main beats.
- The playing-beat indicator tracks correctly across meters and subdivisions.

---

## Step 4 — Theory + Practice panel (next)

A **left-side expanding panel** that is the app's **Theory + Practice hub** — both the
place you launch guided practices *and* the place you go to read up and figure things
out. Step 4 builds the **Rhythm** domain, but the panel is architected for more.

### The panel is a hub, not a metronome accessory (architecture)
Top level is **practice domains**, each with its own practices and its own theory:

- **Rhythm** (built now) — practices preset the **metronome** (beats/subdivision/
  accents/BPM); theory covers subdivision, accents/backbeat, meters/compound feel.
- **Harmony / Chords**, **Scales** (future domains, shown as "coming soon") — practices
  will preset the **fretboard + chord engine** (key, scale, progression); theory will
  show key, scale notes/degrees, chord tones, etc.

So a practice is "apply a domain-specific config + show domain-specific theory." Only
the Rhythm domain has a live engine today; the structure lets Harmony slot in later
without reworking the panel. Each domain shows **both** per-practice tips **and** general
reference content ("read more / figure stuff out"), not just preset buttons.

### Why it exists
We already built every rhythm mechanic; this surfaces them as named, opinionated
practices so the user doesn't have to know how to dial in a "backbeat" or "6/8 feel" by
hand. It teaches while it configures — and becomes the home for all future theory.

### What the user sees and does
- A collapsed tab on the left edge; click to expand the panel.
- Practices grouped (Foundations → Subdivisions → Meters & Feels → Pocket). Each row:
  name + one-line "what it trains."
- Selecting a practice applies its preset to the metronome (via the store) and shows a
  short blurb + a tip. The user then hits the big circle to start. (Preset only —
  it does not auto-start.)
- An "active practice" highlight; manually changing a control just means you've
  customized off a preset (no lock-in).

### Proposed practice menu (default BPMs by feel — refine with user)
Foundations
- **Steady Quarters** — 4 beats, quarter, accent 1, ~80. Lock to the pulse.
- **Backbeat (2 & 4)** — 4 beats, quarter, accents 2 & 4, ~90. Feel the groove/snare.

Subdivisions
- **Eighth Notes** — 4 beats, eighths, accent 1, ~70. Internalize the "and."
- **Sixteenth Notes** — 4 beats, sixteenths, accent 1, ~60. Even picking/strumming.
- **Triplets** — 4 beats, triplets, accent 1, ~66. Compound/blues triplet feel.

Meters & Feels
- **Waltz (3/4)** — 3 beats, quarter, accent 1, ~120. Three-feel.
- **6/8 Compound** — 2 beats, triplets, accent 1, ~60 (felt dotted-quarter). Lilt.
- **5/4 Odd (3+2)** — 5 beats, quarter, accents 1 & 4, ~100. Odd-time grouping.

Pocket
- **Slow Pocket** — 4 beats, eighths, accents 2 & 4, ~55. Sit behind the beat.

Locked until the rhythm-backlog pieces land (shown, disabled, with a note):
- **Shuffle / Swing** — needs swing.
- **Gap-Click (drop beats)** — needs muted beats.
- **Clave / Offbeats** — needs subdivision-level accents.

### Design notes
- **Data-driven** (`lib/practice/`): a `Domain` has `{ id, name, available, theory[] }`;
  a `Practice` has `{ id, domain, group, name, trains, blurb, tip, requires?, rhythm? }`
  where `rhythm` is the domain-specific config (bpm, beatsPerBar, subdivision, accents).
  Future domains add their own config field (e.g. `harmony?`). Adding a practice = a
  data row; adding a domain = a data entry + (when it has an engine) an `apply` mapping.
- Store gains `applyPreset(rhythm)` (sets bpm + beats + accents + subdivision atomically,
  resizing the accent map) and `activePracticeId`. Manual control changes clear
  `activePracticeId` (you've customized off a practice).
- Panel is collapsible; on tablet it overlays rather than squeezing the metronome.
- Future (Harmony/Scales) domains render as "coming soon" now — consistent with showing
  locked practice teasers.

### Files this step touches
```
lib/practice/types.ts     // Domain, Practice, RhythmPreset types
lib/practice/rhythm.ts    // the Rhythm domain: practices + theory reference
lib/practice/index.ts     // domains[] registry (Rhythm + coming-soon stubs)
lib/store/playback.ts     // applyPreset(), activePracticeId
components/PracticePanel.tsx // the left expanding hub (domains, practices, theory)
app/page.tsx              // mounts the panel on the left
```

### Done when
- Selecting a practice instantly configures the metronome to match and shows its blurb.
- Hitting start plays exactly that feel; tweaking a control de-highlights the practice.
- Locked practices and future domains are visible but clearly unavailable.
- Panel reads as a theory hub (reference content present), not just preset buttons.

---

## Time Signature Model (standing note)

How time signatures map onto our controls, so we don't over-build later.

- **Top number = our "Beats" stepper** — the count of units per bar.
- **Bottom number = the note value of one unit** (4 = quarter, 8 = eighth, …). We do
  **not** expose this; the app is effectively always "x/4". This is deliberate: the
  denominator is a *notation/naming* convention, **not an audible property** — N evenly
  spaced clicks per bar at a given BPM sound identical whether the unit is called a
  quarter or an eighth. What's actually audible (pulse count, accent grouping, internal
  subdivision) we already control.
- **Simple vs compound feel:** in simple meters the top number = felt beats. In
  compound meters (6/8, 9/8, 12/8) the units group in threes and you *feel* the groups.
  We reproduce compound feel with the tools we have, e.g. **6/8 = Beats 2 + triplet
  subdivision + stress beat 1** (two dotted-quarter beats, each split into three).
- **If we ever add a denominator picker**, it'd be for *display/labeling* (show "6/8")
  and *accent-grouping presets*, not for new audio behavior. Logged for the
  time-signature backlog item below.

---

## Backlog (the destination — not scheduled, not designed in detail yet)

Kept here so we don't lose the vision. We pull from this one item at a time.

### Rhythm-trainer pieces (flagged as the high-leverage missing mechanics)
- **Muted / silent beats** — a 4th accent level (cycle normal → stressed → muted).
  Unlocks the highest-value drill: clicks drop out and *you* keep time (gap-click,
  "click on 1 only"). Turns the metronome from keeping time *for* you into testing
  *your* time. The accent map already generalizes to it.
- **Subdivision-level accents** — accent the "and"/offbeats, not just whole beats.
  Unlocks clave/son patterns, reggae/ska upbeat training. Needs the click grid to
  carry an accent map at the subdivision resolution, not just per beat.
- **Swing / shuffle** — the deferred groove feel; `Transport.swing` is already wired,
  needs a UI amount + a shuffle subdivision. Unlocks the Shuffle/Swing practice.

### Other backlog
- Swing/groove slider (engine already supports it)
- Drum engine with real samples + genre-aware patterns (shuffle, rock, funk, jazz,
  bossa). Bundles the pad "Tap BPM" mode toggle (auto-revert) so drumming the pads
  doesn't nudge the tempo — see Step 2 → Mode separation.
- Chord/harmony playback (comped chords you can actually jam over) — sonically the
  biggest jump from "tool" to "experience"
- Bar grid / chord chart with a hardcoded 12-bar blues
- Static fretboard rendering a key + scale
- Chord-tone highlighting synced to current bar
- Quick Loop builder (key + scale + progression template + BPM)
- Sub-bar (beat-level) chord changes
- Per-chord scale mode (Dorian over iim7, Mixolydian over V7, etc.) — the theory
  heart of the tool; the reason a single-key model teaches wrong notes over dominants
- LLM chord-sheet parser → structured song
- Song view (chords over lyrics), section looping, Supabase library
- Alternate tunings, capo, fretboard position selector
- Other time signatures (3/4, 6/8) — denominator picker is display/preset only; see
  Time Signature Model standing note. Could ship accent-grouping presets (backbeat,
  6/8, clave-ish) for common feels.

---

## Living-Document Changelog

- **v9** — Built Step 4. Reframed the panel as a **Theory + Practice hub** (domains at
  top level), not a metronome accessory: Rhythm is live (presets metronome + theory),
  Harmony/Scales are coming-soon stubs that will drive the fretboard/chords later. Data
  layer in `lib/practice/` (types, rhythm domain, registry); store gained `applyPreset`
  + `activePracticeId` (manual edits de-highlight). Left expanding drawer with grouped
  practices, per-practice blurb+tip, locked teasers, and a "Learn" theory section.
- **v8** — Marked Step 3 done. Defined Step 4 (Theory + Practice panel): a left
  expanding panel of guided practices that preset the metronome (beats/subdivision/
  accents/BPM) and teach the "why." Proposed an early-intermediate practice menu.
  Added the rhythm-trainer backlog pieces (muted beats, subdivision-level accents,
  swing) and flagged which practices they unlock.
- **v7** — Added the Time Signature Model standing note: top number = Beats stepper,
  denominator is display-only (not audible), compound feel achieved via beats +
  subdivision + stress. Noted denominator picker as display/preset-only future work.
- **v6** — Defined + built Step 3 (metronome expansion): interactive beat row
  (indicator + per-beat stress), beats-per-bar stepper, and subdivision selector
  (quarter/eighth/triplet/sixteenth). Click voice gained a 3rd "subdivision" level.
  Scheduler clicks on a fine fixed 12-ticks/beat grid and gates per subdivision, so
  subdivision/meter/stress all apply live with no reschedule (fixes the mid-play
  glitch when changing subdivision). Swing/shuffle subdivision deferred to musical
  expansion. Pushed as one "Metronome expansion" commit.
- **v5** — Decided pad mode separation: a small "Tap BPM" toggle (auto-revert after
  the >2s gap) will gate drum-mode vs tempo-mode on the pads. Documented to ship with
  the drum samples, not before (avoids dead UI). `useTapTempo` stays unchanged.
- **v4** — Defined Step 2 (Tap Pads). A 2×2 unlabelled pad grid in the top-right,
  dual-purpose: tap tempo now, drum-sample triggers later (per-pad voice slot
  designed in from the start). Tap tempo moved off the big circle onto the pads so
  start/stop stays single-purpose. Reverted the big-button tap-tempo experiment.
- **v3** — Built Step 1 (metronome). Scaffolded Next.js 16 (App Router, TS,
  Tailwind v4) + Tone.js + Zustand. Implemented the audio engine (`engine.ts`),
  metronome scheduling with swappable click voice (`metronome.ts`), playback store,
  and the big clickable control + BPM slider + beat dots. Added the Sound Sourcing
  Strategy section (samples for acoustic instruments, synthesis for synths/click).
- **v2** — Rewrote around foundation-first philosophy. Locked in audio-engine
  design decisions (autoplay unlock, singleton lifecycle, music-aware clock with
  swing/sub-beat/time-sig hooks, sample pipeline). Scoped Step 1 to the metronome.
  Moved the full vision into North Star + Backlog.
- **v1** — Original full-app spec (chord practice tool with fretboard, drums, LLM
  parser). Preserved as the North Star.
