/**
 * The Rhythm domain (SPEC Step 4): guided practices that preset the metronome, plus
 * reference theory. Default BPMs follow a "by feel" logic — subdivision-dense practices
 * default slower so the fast clicks stay playable and the grid is audible.
 */
import type { Domain, Practice } from "@/lib/practice/types";

/** Accent map of `beats` length with the given (0-indexed) beats stressed. */
const accents = (beats: number, ...on: number[]): boolean[] =>
  Array.from({ length: beats }, (_, i) => on.includes(i));

/** Mute map of `beats` length with the given (0-indexed) beats silenced. */
const mutes = (beats: number, ...off: number[]): boolean[] =>
  Array.from({ length: beats }, (_, i) => off.includes(i));

const practices: Practice[] = [
  // ── Foundations ──
  {
    id: "steady-quarters",
    domain: "rhythm",
    group: "Foundations",
    name: "Steady Quarters",
    trains: "Lock to the pulse",
    blurb:
      "The bedrock: one click per beat, accent on 1. Play one clean note per click and listen for your note landing exactly with the click — not just near it.",
    tip: "Aim to make the click 'disappear' under your note. If you still hear it, you're off.",
    rhythm: { bpm: 80, beatsPerBar: 4, subdivision: 1, accents: accents(4, 0) },
  },
  {
    id: "backbeat",
    domain: "rhythm",
    group: "Foundations",
    name: "Backbeat (2 & 4)",
    trains: "Feel the groove",
    blurb:
      "Accents on 2 and 4 — where the snare sits in nearly all rock, pop and funk. Practicing to it trains you to sit in the pocket instead of rushing the downbeat.",
    tip: "Don't play ON the accents — feel them as the backbeat while you play the 1 and 3.",
    rhythm: { bpm: 90, beatsPerBar: 4, subdivision: 1, accents: accents(4, 1, 3) },
  },

  // ── Subdivisions ──
  {
    id: "eighths",
    domain: "rhythm",
    group: "Subdivisions",
    name: "Eighth Notes",
    trains: "Internalize the 'and'",
    blurb:
      "Two clicks per beat: 1-and-2-and. The off-beat 'and' is where most timing slips. Get it even and your alternate picking and strumming tighten up.",
    tip: "Count '1 and 2 and' out loud while you play. The 'and' should be exactly halfway.",
    rhythm: { bpm: 70, beatsPerBar: 4, subdivision: 2, accents: accents(4, 0) },
  },
  {
    id: "sixteenths",
    domain: "rhythm",
    group: "Subdivisions",
    name: "Sixteenth Notes",
    trains: "Even picking & strumming",
    blurb:
      "Four clicks per beat. The finest standard grid — this is where evenness in fast picking lives. Keep slow until every note is glued to a click.",
    tip: "If notes blur together, drop the BPM. Clean and slow beats fast and sloppy.",
    rhythm: { bpm: 60, beatsPerBar: 4, subdivision: 4, accents: accents(4, 0) },
  },
  {
    id: "triplets",
    domain: "rhythm",
    group: "Subdivisions",
    name: "Triplets",
    trains: "Compound / blues feel",
    blurb:
      "Three clicks per beat: 'trip-l-et'. The heartbeat of blues, shuffle and ballads. Switching between triplets and eighths trains the two feels your hands need most.",
    tip: "Say 'tri-pl-et' evenly. Avoid letting it collapse into a lopsided long-short.",
    rhythm: { bpm: 66, beatsPerBar: 4, subdivision: 3, accents: accents(4, 0) },
  },

  // ── Meters & Feels ──
  {
    id: "waltz",
    domain: "rhythm",
    group: "Meters & Feels",
    name: "Waltz (3/4)",
    trains: "Three-feel",
    blurb:
      "Three beats per bar, strong 1. The waltz/folk feel. Counting in 3 instead of 4 rewires how you phrase — many songs you know are secretly in 3.",
    tip: "Feel it as STRONG-light-light. Let beat 1 carry weight; 2 and 3 are lighter.",
    rhythm: { bpm: 120, beatsPerBar: 3, subdivision: 1, accents: accents(3, 0) },
  },
  {
    id: "six-eight",
    domain: "rhythm",
    group: "Meters & Feels",
    name: "6/8 Compound",
    trains: "The lilt",
    blurb:
      "Two felt beats, each split into three (the dotted-quarter pulse). That rolling 'ONE-da-da TWO-da-da' is the lilt of jigs and slow ballads alike.",
    tip: "Count in 2, not 6 — feel two big beats, each with a triplet underneath.",
    rhythm: { bpm: 60, beatsPerBar: 2, subdivision: 3, accents: accents(2, 0) },
  },
  {
    id: "five-four",
    domain: "rhythm",
    group: "Meters & Feels",
    name: "5/4 Odd (3+2)",
    trains: "Odd-time grouping",
    blurb:
      "Five beats, grouped 3+2 (accents on 1 and 4). Odd time feels alien until you hear the grouping — then it grooves. A reach item, but a great ear-opener.",
    tip: "Feel it as a bar of 3 plus a bar of 2, glued together. Lean on 1 and 4.",
    rhythm: { bpm: 100, beatsPerBar: 5, subdivision: 1, accents: accents(5, 0, 3) },
  },

  // ── Pocket ──
  {
    id: "slow-pocket",
    domain: "rhythm",
    group: "Pocket",
    name: "Slow Pocket",
    trains: "Sit behind the beat",
    blurb:
      "Slow tempo, eighths, backbeat on 2 and 4. Slow is harder — it exposes every flaw. Practice placing notes a hair behind the click for a laid-back, soulful feel.",
    tip: "Relax. Try playing just slightly late and even — that's the pocket, not a mistake.",
    rhythm: { bpm: 55, beatsPerBar: 4, subdivision: 2, accents: accents(4, 1, 3) },
  },

  // ── Feels (now unlocked) ──
  {
    id: "shuffle",
    domain: "rhythm",
    group: "Meters & Feels",
    name: "Shuffle / Swing",
    trains: "Swung eighths",
    blurb:
      "The long-short bounce of blues and jazz. With swing on, the off-beat 'and' lays back toward the triplet — the click does the bounce so your hands can feel it.",
    tip: "Play eighths along with it. Feel the lazy 'and' — long, then short.",
    rhythm: {
      bpm: 90,
      beatsPerBar: 4,
      subdivision: 2,
      accents: accents(4, 1, 3),
      swing: 0.6,
    },
  },
  {
    id: "gap-click",
    domain: "rhythm",
    group: "Pocket",
    name: "Gap-Click (drop beats)",
    trains: "Keep time without help",
    blurb:
      "The click sounds only on beat 1; beats 2–4 are silent. You keep the time yourself and check that beat 1 still lands with the click. The single best test of your internal clock.",
    tip: "Watch the indicator pass the silent beats — but don't lean on it. Feel them.",
    rhythm: {
      bpm: 80,
      beatsPerBar: 4,
      subdivision: 1,
      accents: accents(4, 0),
      mutes: mutes(4, 1, 2, 3),
    },
  },

  // ── Locked (shown as teasers; unlock when the mechanic lands) ──
  {
    id: "clave",
    domain: "rhythm",
    group: "Locked",
    name: "Clave / Off-beats",
    trains: "Syncopation",
    blurb:
      "Accents on the 'and's and inner subdivisions — the backbone of Latin, funk and reggae. Needs accents at the subdivision level, not just whole beats.",
    tip: "Needs off-beat accents. Then you can build son clave and reggae upbeats.",
    requires: "subAccents",
  },
];

export const rhythmDomain: Domain = {
  id: "rhythm",
  name: "Rhythm",
  blurb: "Build your internal clock: pulse, subdivision, accents and feel.",
  available: true,
  practices,
  theory: [
    {
      heading: "Subdivision is the grid inside you",
      body: "Every beat can be split — into 2 (eighths), 3 (triplets) or 4 (sixteenths). The skill is feeling those small notes even when you don't play them. Practice with the grid on, then drop back to quarters and keep it running in your head.",
    },
    {
      heading: "Accents make the feel",
      body: "Same clicks, different groove depending on what you stress. Accent 1 for a square feel; accent 2 & 4 for the backbeat that drives most popular music. Where you put the stress is where the music breathes.",
    },
    {
      heading: "Beats per bar = the meter",
      body: "The number of beats you count per bar. 4 is home base; 3 is a waltz; 5 and 7 are odd-time. Accent the start of each group to make odd meters feel natural rather than random.",
    },
    {
      heading: "Simple vs compound feel",
      body: "In simple meters the beats divide in 2. In compound meters (like 6/8) they divide in 3 and you feel the groups, not the individual notes — 6/8 is really two big beats, each a triplet. Recreate it here with 2 beats + triplet subdivision.",
    },
    {
      heading: "Slow is harder (and better)",
      body: "Low tempos expose every timing flaw because you must feel the long gaps. If a passage is clean slow, speed comes easily. Rushing fast and sloppy teaches your hands the wrong thing.",
    },
    {
      heading: "Drop beats to test yourself",
      body: "Click a beat a second time to mute it. With beats silenced, the metronome stops keeping time FOR you and starts testing whether YOU can — keep the pulse through the gaps and check you're still locked when the click returns. The fastest way to build a real internal clock.",
    },
    {
      heading: "Swing makes it bounce",
      body: "Swing delays the off-beat 'and' so straight eighths lean toward a triplet — the long-short shuffle of blues and jazz. Turn it up gradually and play eighths along: you'll feel the lazy bounce that 'straight' time doesn't have.",
    },
  ],
};
