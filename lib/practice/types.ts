/**
 * Theory + Practice hub data model (SPEC Step 4).
 *
 * The panel is a hub of practice *domains*. Each domain owns practices and theory.
 * A practice applies a domain-specific config and shows domain-specific theory.
 * Today only the Rhythm domain has a live engine (the metronome); the shape leaves
 * room for Harmony/Scales domains to add their own config + theory later.
 */
import type { RhythmPreset } from "@/lib/store/playback";

export type DomainId = "rhythm" | "harmony" | "scales";

/** Capabilities a practice may depend on that don't exist yet (shown but locked). */
export type Requirement = "mutedBeats" | "swing" | "subAccents";

export const REQUIREMENT_LABEL: Record<Requirement, string> = {
  mutedBeats: "muted beats",
  swing: "swing",
  subAccents: "off-beat accents",
};

export type Practice = {
  id: string;
  domain: DomainId;
  group: string; // e.g. "Foundations"
  name: string;
  trains: string; // one-line "what it trains"
  blurb: string; // the "why", shown when selected
  tip: string; // a concrete how-to cue
  requires?: Requirement; // present → locked until that mechanic lands
  /** Rhythm-domain config applied to the metronome. Future domains add their own. */
  rhythm?: RhythmPreset;
};

export type TheorySection = {
  heading: string;
  body: string;
};

export type Domain = {
  id: DomainId;
  name: string;
  blurb: string;
  available: boolean; // false → "coming soon"
  practices: Practice[];
  theory: TheorySection[];
};
