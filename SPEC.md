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

## Step 1 — The Metronome

A large, clickable metronome with a BPM slider, sitting on the foundational audio
engine described above. This is the whole feature. Everything else waits.

### What the user sees and does
- A big, prominent, clickable metronome control — the visual centerpiece.
- Tapping it the first time unlocks audio (satisfies autoplay policy) and starts
  the click. Tapping again stops it.
- A BPM slider (and a clear numeric readout) that changes tempo live while playing.
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

## Backlog (the destination — not scheduled, not designed in detail yet)

Kept here so we don't lose the vision. We pull from this one item at a time.

- Swing/groove slider (engine already supports it)
- Drum engine with real samples + genre-aware patterns (shuffle, rock, funk, jazz, bossa)
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
- Other time signatures (3/4, 6/8)

---

## Living-Document Changelog

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
