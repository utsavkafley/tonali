/**
 * Domain registry for the Theory + Practice hub (SPEC Step 4). Rhythm is live; the
 * others are "coming soon" stubs so the panel shows where the app is headed — each
 * will gain practices + theory + an engine mapping when it's built.
 */
import type { Domain } from "@/lib/practice/types";
import { rhythmDomain } from "@/lib/practice/rhythm";

const harmonyDomain: Domain = {
  id: "harmony",
  name: "Chords & Harmony",
  blurb: "Chord tones, progressions and what notes work where — over real songs.",
  available: false,
  practices: [],
  theory: [],
};

const scalesDomain: Domain = {
  id: "scales",
  name: "Scales",
  blurb: "Scale shapes, degrees and the sounds each one makes on the fretboard.",
  available: true,
  practices: [], // guided scale drills coming; theory is live now
  theory: [
    {
      heading: "Read degrees, not just dots",
      body: "Each note is labelled by its scale degree: R is the root, Δ = major interval, p = perfect, ♭ = flat/minor. Learning where the R, ♭3 and 5 sit in every position is what lets you target chord tones instead of running shapes blindly.",
    },
    {
      heading: "Pentatonic vs the full scale",
      body: "Minor pentatonic (R ♭3 p4 p5 ♭7) is the safe five-note core. The blues scale adds the ♭5 'blue note'. Natural minor fills in the Δ2 and ♭6 for a richer, more melodic sound. Start pentatonic, then add notes.",
    },
    {
      heading: "Connect positions",
      body: "Don't get stuck in one box. Use the fret window to view two or three positions together and find the shared notes that let you slide between them — that's how solos stop sounding robotic.",
    },
    {
      heading: "The root is home",
      body: "The orange R notes are your resolution points. Phrases that land on a root feel finished; landing on a ♭3 or ♭7 feels tense and wanting. Improvise by leaving and returning home.",
    },
  ],
};

export const domains: Domain[] = [rhythmDomain, harmonyDomain, scalesDomain];
