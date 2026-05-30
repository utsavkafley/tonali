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
  available: false,
  practices: [],
  theory: [],
};

export const domains: Domain[] = [rhythmDomain, harmonyDomain, scalesDomain];
